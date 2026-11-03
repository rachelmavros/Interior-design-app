import { serpSearch } from './serp';
import type { InspoPhoto } from '../types';

/** Pinterest's mid-size rendition: sharp in the grid, far lighter than the original. */
function gridSize(url: string) {
  return url.replace(/(i\.pinimg\.com)\/originals\//, '$1/736x/');
}

/**
 * Styled-room photos from Pinterest, found through Google Images (Pinterest
 * has no public search API). Each page is one SerpAPI search of ~100 images;
 * SerpAPI serves repeats within an hour from its cache at no charge.
 */
export async function searchPins(query: string, page: number) {
  const data = await serpSearch({ engine: 'google_images', q: `${query} site:pinterest.com`, ijn: String(page) });
  const raw: any[] = data.images_results || [];
  const photos: InspoPhoto[] = raw
    .filter((r) => typeof r.original === 'string' && /^https:\/\//.test(r.original) && typeof r.link === 'string')
    .map((r, i) => ({
      id: `pin-${page}-${i}-${r.original}`,
      src: gridSize(r.original),
      full: r.original,
      width: r.original_width || 4,
      height: r.original_height || 5,
      color: '#e8e2d9',
      alt: r.title || 'Interior inspiration',
      author: r.source || 'Pinterest',
      authorUrl: r.link,
      sourceUrl: r.link,
      provider: 'pinterest' as const,
    }));
  return { photos, hasMore: raw.length >= 50 && page < 4 };
}
