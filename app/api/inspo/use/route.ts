import { guard, isMock, json } from '@/lib/server/guard';
import { reportUse } from '@/lib/server/unsplash';

/** Tells Unsplash a photo was opened for shopping, as their API guidelines require. */
export async function POST(req: Request) {
  const blocked = guard(req, 'inspo-use', 30);
  if (blocked) return blocked;
  const { url } = await req.json().catch(() => ({}));
  if (isMock() || typeof url !== 'string') return json({ ok: true });
  try {
    await reportUse(url);
  } catch (e) {
    console.warn('unsplash use', e);
  }
  return json({ ok: true });
}
