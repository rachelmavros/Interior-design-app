import { timingSafeEqual } from 'node:crypto';

const hits = new Map<string, number[]>();

export function json(body: unknown, status = 200) {
  return Response.json(body, { status });
}

function codeMatches(given: string, expected: string) {
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Access-code check plus a best-effort per-IP rate limit. The limiter is per
 * serverless instance, so it slows abuse rather than strictly capping it.
 */
export function guard(
  req: Request,
  bucket: string,
  limit: number,
  windowMs = 60_000,
): Response | null {
  const code = process.env.APP_ACCESS_CODE;
  if (code && !codeMatches(req.headers.get('x-access-code') || '', code)) {
    return json({ error: 'Access code required', code: 'ACCESS_REQUIRED' }, 401);
  }

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'local';
  const key = `${bucket}:${ip}`;
  const now = Date.now();
  const recent = (hits.get(key) || []).filter((t) => now - t < windowMs);
  if (recent.length >= limit) {
    return json({ error: 'Too many requests — give it a minute and try again.' }, 429);
  }
  recent.push(now);
  hits.set(key, recent);
  return null;
}

export const isMock = () => process.env.MOCK_APIS === '1' || process.env.MOCK_APIS === 'true';
