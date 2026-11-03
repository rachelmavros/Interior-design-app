import type { Story } from '../types';

const FEED = 'https://www.architecturaldigest.com/feed/rss';

function decode(s: string) {
  return s
    .replace(/^<!\[CDATA\[([\s\S]*)\]\]>$/, '$1')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;|&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .trim();
}

function tag(item: string, name: string) {
  const m = item.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, 'i'));
  return m ? decode(m[1]) : '';
}

function image(item: string) {
  const attr = (name: string) => item.match(new RegExp(`<${name}[^>]*\\burl="([^"]+)"`, 'i'))?.[1];
  const fromHtml = decode(tag(item, 'description')).match(/<img[^>]+src="([^"]+)"/i)?.[1];
  const url = attr('media:thumbnail') || attr('media:content') || attr('enclosure') || fromHtml;
  return url ? decode(url) : undefined;
}

/** Latest Architectural Digest stories: headline, image and link back to AD. */
export async function latestStories(limit = 12): Promise<Story[]> {
  const res = await fetch(FEED, {
    headers: { accept: 'application/rss+xml, application/xml;q=0.9, */*;q=0.8' },
    next: { revalidate: 3600 },
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`Feed error (${res.status})`);
  const xml = await res.text();
  const items = xml.match(/<item[\s>][\s\S]*?<\/item>/gi) || [];
  return items
    .map((item) => ({
      title: tag(item, 'title'),
      link: tag(item, 'link'),
      image: image(item),
      date: tag(item, 'pubDate'),
    }))
    .filter((s) => s.title && /^https:\/\//.test(s.link))
    .slice(0, limit);
}
