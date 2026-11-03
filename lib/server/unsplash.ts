import type { InspoPhoto } from '../types';

const API = 'https://api.unsplash.com';
/** Unsplash asks for this on every credit link back to them. */
const UTM = 'utm_source=room_to_shop&utm_medium=referral';

function headers() {
  const key = process.env.UNSPLASH_ACCESS_KEY;
  if (!key) throw new Error('UNSPLASH_ACCESS_KEY is not configured');
  return { Authorization: `Client-ID ${key}`, 'Accept-Version': 'v1' };
}

export async function searchPhotos(query: string, page: number) {
  const qs = new URLSearchParams({ query, page: String(page + 1), per_page: '24', content_filter: 'high' });
  // The free tier allows 50 searches an hour, so identical searches are shared for an hour.
  const res = await fetch(`${API}/search/photos?${qs}`, {
    headers: headers(),
    next: { revalidate: 3600 },
    signal: AbortSignal.timeout(15_000),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.errors?.[0] || `Unsplash error (${res.status})`);
  const photos: InspoPhoto[] = (data.results || []).map((r: any) => ({
    id: r.id,
    src: `${r.urls.raw}&w=900&fit=max&q=75&auto=format`,
    full: `${r.urls.raw}&w=1800&fit=max&q=85&fm=jpg`,
    width: r.width,
    height: r.height,
    color: r.color || '#e8e2d9',
    alt: r.alt_description || r.description || 'Interior photo',
    author: r.user?.name || 'Unsplash',
    authorUrl: `${r.user?.links?.html || 'https://unsplash.com'}?${UTM}`,
    sourceUrl: `${r.links?.html || 'https://unsplash.com'}?${UTM}`,
    useUrl: r.links?.download_location,
    provider: 'unsplash' as const,
  }));
  return { photos, hasMore: page + 1 < (data.total_pages || 0) };
}

/** Unsplash's guidelines ask apps to report when a photo is actually used. */
export async function reportUse(downloadLocation: string) {
  const url = new URL(downloadLocation);
  if (url.hostname !== 'api.unsplash.com') return;
  await fetch(url, { headers: headers(), signal: AbortSignal.timeout(10_000) });
}

export const UNSPLASH_HOME = `https://unsplash.com/?${UTM}`;
