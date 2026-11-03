import type { Magazine, Story } from '../types';

/** Feeds tried in order per magazine; a magazine whose feeds all fail is left out. */
const MAGAZINES: { name: string; home: string; feeds: string[] }[] = [
  { name: 'Architectural Digest', home: 'https://www.architecturaldigest.com', feeds: ['https://www.architecturaldigest.com/feed/rss'] },
  { name: 'ELLE Decor', home: 'https://www.elledecor.com', feeds: ['https://www.elledecor.com/rss/all.xml/'] },
  {
    name: 'Domino',
    home: 'https://www.domino.com',
    feeds: ['https://www.domino.com/rss', 'https://www.domino.com/feed', 'https://www.domino.com/feeds/all.rss'],
  },
  { name: 'Dwell', home: 'https://www.dwell.com', feeds: ['https://www.dwell.com/@dwell/rss'] },
  {
    name: 'Apartment Therapy',
    home: 'https://www.apartmenttherapy.com',
    feeds: ['https://www.apartmenttherapy.com/main.rss', 'https://www.apartmenttherapy.com/design.rss'],
  },
];

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

function linkOf(item: string) {
  const rss = tag(item, 'link');
  if (rss) return rss;
  // Atom: <link rel="alternate" href="..."/>
  const atom = item.match(/<link[^>]*rel="alternate"[^>]*href="([^"]+)"/i) || item.match(/<link[^>]*href="([^"]+)"/i);
  return atom ? decode(atom[1]) : '';
}

async function readFeed(url: string, limit: number): Promise<Story[]> {
  const res = await fetch(url, {
    headers: { accept: 'application/rss+xml, application/atom+xml, application/xml;q=0.9, */*;q=0.8' },
    next: { revalidate: 3600 },
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`Feed error (${res.status})`);
  const xml = await res.text();
  const items = xml.match(/<(item|entry)[\s>][\s\S]*?<\/(item|entry)>/gi) || [];
  const stories = items
    .map((item) => ({
      title: tag(item, 'title'),
      link: linkOf(item),
      image: image(item),
      date: tag(item, 'pubDate') || tag(item, 'published') || tag(item, 'updated'),
    }))
    .filter((s) => s.title && /^https:\/\//.test(s.link))
    .slice(0, limit);
  if (!stories.length) throw new Error('Empty feed');
  return stories;
}

/** Latest stories from each design magazine: headline, image and link back to the magazine. */
export async function magazineRows(limit = 20): Promise<Magazine[]> {
  const rows = await Promise.all(
    MAGAZINES.map(async (m) => {
      for (const feed of m.feeds) {
        try {
          return { name: m.name, home: m.home, stories: await readFeed(feed, limit) };
        } catch (e) {
          console.warn('editorial', feed, (e as Error).message);
        }
      }
      return null;
    }),
  );
  return rows.filter((r): r is Magazine => r !== null);
}
