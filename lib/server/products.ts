import { affiliateLink } from './affiliate';
import type { Product } from '../types';

type Raw = Record<string, any>;

function num(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string') {
    const n = parseFloat(v.replace(/[^0-9.]/g, ''));
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function priceOf(r: Raw): { price: number | null; priceText?: string } {
  // Lens returns price as { value, extracted_value, currency }; Shopping returns
  // price as a string with extracted_price alongside.
  if (r.price && typeof r.price === 'object') {
    return {
      price: num(r.price.extracted_value) ?? num(r.price.value),
      priceText: r.price.value,
    };
  }
  return {
    price: num(r.extracted_price) ?? num(r.price),
    priceText: typeof r.price === 'string' ? r.price : undefined,
  };
}

function stockOf(r: Raw): boolean | null {
  if (typeof r.in_stock === 'boolean') return r.in_stock;
  if (typeof r.out_of_stock === 'boolean') return !r.out_of_stock;
  return null;
}

export function normalize(r: Raw, origin: Product['origin'], i: number): Product | null {
  const rawLink: string | undefined = r.link || r.product_link;
  if (!r.title || !rawLink) return null;
  const { price, priceText } = priceOf(r);
  return {
    id: `${origin}-${i}-${String(rawLink).slice(-40)}`,
    title: String(r.title),
    link: affiliateLink(rawLink),
    source: isMarketplace(rawLink) ? 'Facebook Marketplace' : r.source || r.merchant?.name || hostOf(rawLink),
    sourceIcon: r.source_icon,
    thumbnail: r.serpapi_thumbnail || r.thumbnail,
    image: r.image || r.original || undefined,
    price,
    priceText,
    oldPrice: num(r.extracted_old_price) ?? num(r.old_price),
    rating: num(r.rating),
    reviews: num(r.reviews),
    inStock: stockOf(r),
    delivery: typeof r.delivery === 'string' ? r.delivery : undefined,
    origin,
  };
}

function isMarketplace(u: string) {
  return /facebook\.com\/marketplace/i.test(u);
}

function hostOf(u: string) {
  try {
    return new URL(u).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

export function dedupe(products: Product[]): Product[] {
  const seen = new Set<string>();
  return products.filter((p) => {
    const key = p.link.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** A short, shopping-friendly query from the strongest visual matches. */
export function suggestQuery(products: Product[]): string | undefined {
  const top = products.find((p) => p.price !== null) || products[0];
  if (!top) return undefined;
  return top.title
    .replace(/\s*[|–—-]\s.*$/, '')
    .replace(/[^\p{L}\p{N}\s&'-]/gu, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 8)
    .join(' ');
}
