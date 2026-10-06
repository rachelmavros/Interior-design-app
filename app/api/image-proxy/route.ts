import { json } from '@/lib/server/guard';
import { BROWSER_UA, FetchBlocked, readCapped, safeFetch } from '@/lib/server/safeFetch';

export const maxDuration = 30;

const MAX_BYTES = 12 * 1024 * 1024;

/**
 * Fetches a remote product image so the browser can draw it to a canvas
 * (cross-origin images can't be read back for background removal).
 */
export async function GET(req: Request) {
  const target = new URL(req.url).searchParams.get('url') || '';
  try {
    const { res } = await safeFetch(target, { headers: { 'user-agent': BROWSER_UA, accept: 'image/*' } });
    const type = res.headers.get('content-type') || '';
    if (!res.ok || !type.startsWith('image/') || type.includes('svg')) return json({ error: 'Not an image' }, 502);
    const buf = await readCapped(res, MAX_BYTES);
    return new Response(new Uint8Array(buf), {
      headers: { 'content-type': type, 'cache-control': 'public, max-age=86400' },
    });
  } catch (e) {
    if (e instanceof FetchBlocked) return json({ error: e.message }, 400);
    return json({ error: 'Fetch failed' }, 502);
  }
}
