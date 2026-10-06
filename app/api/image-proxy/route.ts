import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import { json } from '@/lib/server/guard';

export const maxDuration = 30;

const MAX_BYTES = 10 * 1024 * 1024;

function isPrivate(ip: string) {
  if (isIP(ip) === 6) {
    const v = ip.toLowerCase();
    if (v.startsWith('::ffff:')) return isPrivate(v.slice(7));
    return v === '::1' || v === '::' || v.startsWith('fc') || v.startsWith('fd') || v.startsWith('fe80');
  }
  const [a, b] = ip.split('.').map(Number);
  return (
    a === 0 || a === 10 || a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    a >= 224
  );
}

/**
 * Fetches a retailer product image so the browser can draw it to a canvas
 * (cross-origin images can't be read back for background removal).
 */
export async function GET(req: Request) {
  const target = new URL(req.url).searchParams.get('url') || '';
  let url: URL;
  try {
    url = new URL(target);
  } catch {
    return json({ error: 'Bad url' }, 400);
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return json({ error: 'Bad url' }, 400);
  if (url.username || url.password) return json({ error: 'Bad url' }, 400);

  try {
    const addrs = isIP(url.hostname) ? [{ address: url.hostname }] : await lookup(url.hostname, { all: true });
    if (!addrs.length || addrs.some((a) => isPrivate(a.address))) return json({ error: 'Blocked host' }, 400);
  } catch {
    return json({ error: 'Unknown host' }, 400);
  }

  let res: Response;
  try {
    res = await fetch(url, {
      redirect: 'error',
      signal: AbortSignal.timeout(15_000),
      headers: { 'user-agent': 'Mozilla/5.0 (compatible; RoomToShop/2.0)', accept: 'image/*' },
    });
  } catch {
    return json({ error: 'Fetch failed' }, 502);
  }
  const type = res.headers.get('content-type') || '';
  if (!res.ok || !type.startsWith('image/') || type.includes('svg')) return json({ error: 'Not an image' }, 502);
  const len = Number(res.headers.get('content-length') || 0);
  if (len > MAX_BYTES) return json({ error: 'Image too large' }, 413);

  const buf = await res.arrayBuffer();
  if (buf.byteLength > MAX_BYTES) return json({ error: 'Image too large' }, 413);
  return new Response(buf, {
    headers: { 'content-type': type, 'cache-control': 'public, max-age=86400' },
  });
}
