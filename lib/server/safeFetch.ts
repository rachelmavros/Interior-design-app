import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';

function isPrivate(ip: string): boolean {
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

export class FetchBlocked extends Error {}

async function assertPublic(url: URL) {
  if (url.protocol !== 'https:' && url.protocol !== 'http:') throw new FetchBlocked('Only web links are supported');
  if (url.username || url.password) throw new FetchBlocked('Bad link');
  let addrs: { address: string }[];
  try {
    addrs = isIP(url.hostname) ? [{ address: url.hostname }] : await lookup(url.hostname, { all: true });
  } catch {
    throw new FetchBlocked('That site could not be found');
  }
  if (!addrs.length || addrs.some((a) => isPrivate(a.address))) throw new FetchBlocked('That address is not allowed');
}

/**
 * fetch() for user-supplied URLs: only public hosts, and every redirect hop
 * is re-checked so a public URL can't bounce us into a private network.
 */
export async function safeFetch(raw: string, init: RequestInit = {}, maxHops = 4): Promise<{ res: Response; url: URL }> {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new FetchBlocked('That doesn’t look like a link');
  }
  for (let hop = 0; hop <= maxHops; hop++) {
    await assertPublic(url);
    const res = await fetch(url, { ...init, redirect: 'manual', signal: AbortSignal.timeout(15_000) });
    const loc = res.headers.get('location');
    if (res.status >= 300 && res.status < 400 && loc) {
      url = new URL(loc, url);
      continue;
    }
    return { res, url };
  }
  throw new FetchBlocked('Too many redirects');
}

export async function readCapped(res: Response, maxBytes: number): Promise<Uint8Array> {
  const len = Number(res.headers.get('content-length') || 0);
  if (len > maxBytes) throw new FetchBlocked('File too large');
  const reader = res.body?.getReader();
  if (!reader) return new Uint8Array();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.length;
    if (total > maxBytes) {
      reader.cancel().catch(() => {});
      throw new FetchBlocked('File too large');
    }
    chunks.push(value);
  }
  const out = new Uint8Array(total);
  let o = 0;
  for (const c of chunks) {
    out.set(c, o);
    o += c.length;
  }
  return out;
}

export const BROWSER_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';
