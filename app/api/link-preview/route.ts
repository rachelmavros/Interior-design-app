import { guard, isMock, json } from '@/lib/server/guard';
import { mockProducts } from '@/lib/server/mock';
import { affiliateLink } from '@/lib/server/affiliate';
import { BROWSER_UA, FetchBlocked, readCapped, safeFetch } from '@/lib/server/safeFetch';
import type { Product } from '@/lib/types';

export const maxDuration = 30;

function decode(s: string) {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim();
}

function meta(html: string, keys: string[]): string | undefined {
  for (const key of keys) {
    const k = key.replace(/[.:]/g, '\\$&');
    const re = [
      new RegExp(`<meta[^>]+(?:property|name|itemprop)=["']${k}["'][^>]*content=["']([^"']+)["']`, 'i'),
      new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]*(?:property|name|itemprop)=["']${k}["']`, 'i'),
    ];
    for (const r of re) {
      const m = html.match(r);
      if (m?.[1]) return decode(m[1]);
    }
  }
}

/** Pulls a schema.org Product out of JSON-LD, which most big retailers publish. */
function jsonLdProduct(html: string): { name?: string; image?: string; price?: number } {
  const blocks = html.match(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi) || [];
  for (const block of blocks) {
    try {
      const data = JSON.parse(block.replace(/^<script[^>]*>|<\/script>$/gi, ''));
      const nodes: any[] = Array.isArray(data) ? data : data['@graph'] || [data];
      for (const n of nodes) {
        const type = [].concat(n?.['@type'] || []).join(' ');
        if (!/Product/i.test(type)) continue;
        const img = Array.isArray(n.image) ? n.image[0] : n.image;
        const offer = Array.isArray(n.offers) ? n.offers[0] : n.offers;
        const price = parseFloat(offer?.price ?? offer?.lowPrice ?? '');
        return {
          name: n.name,
          image: typeof img === 'string' ? img : img?.url,
          price: Number.isFinite(price) ? price : undefined,
        };
      }
    } catch {}
  }
  return {};
}

export async function GET(req: Request) {
  const blocked = guard(req, 'link', 30);
  if (blocked) return blocked;
  const target = new URL(req.url).searchParams.get('url') || '';

  if (isMock()) {
    const [p] = mockProducts(target, 'link', 1);
    return json({ image: p.image, product: { ...p, link: target } });
  }

  try {
    const { res, url } = await safeFetch(target, {
      headers: { 'user-agent': BROWSER_UA, accept: 'text/html,image/*;q=0.9,*/*;q=0.5', 'accept-language': 'en-US,en' },
    });
    const type = res.headers.get('content-type') || '';
    if (!res.ok) {
      return json({ error: 'That store didn’t let us read the page. Save the product photo and upload it instead.' }, 422);
    }
    if (type.startsWith('image/')) {
      res.body?.cancel().catch(() => {});
      return json({ image: url.toString() });
    }
    if (!type.includes('html')) return json({ error: 'That link isn’t a web page or image.' }, 422);

    const html = new TextDecoder().decode(await readCapped(res, 2 * 1024 * 1024));
    const ld = jsonLdProduct(html);
    const rawImage = ld.image || meta(html, ['og:image:secure_url', 'og:image', 'twitter:image', 'twitter:image:src']);
    if (!rawImage) {
      return json({ error: 'Couldn’t find a product photo on that page. Save the photo and upload it instead.' }, 422);
    }
    const image = new URL(rawImage, url).toString();
    const title = ld.name || meta(html, ['og:title', 'twitter:title']) || html.match(/<title[^>]*>([^<]+)/i)?.[1];
    const priceRaw = ld.price ?? parseFloat(meta(html, ['product:price:amount', 'og:price:amount', 'price']) || '');
    const price = Number.isFinite(priceRaw) ? Number(priceRaw) : null;
    const source = (meta(html, ['og:site_name']) || url.hostname.replace(/^www\./, '')).slice(0, 60);

    const product: Product = {
      id: `link-${Date.now()}`,
      title: decode(title || 'Linked product').slice(0, 160),
      link: affiliateLink(url.toString()),
      source,
      image,
      thumbnail: image,
      price,
      priceText: price !== null ? `$${price}` : undefined,
      origin: 'link',
    };
    return json({ image, product });
  } catch (e) {
    if (e instanceof FetchBlocked) return json({ error: e.message }, 400);
    console.error('link-preview', e);
    return json({ error: 'Couldn’t open that link.' }, 502);
  }
}
