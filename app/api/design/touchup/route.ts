import { guard, isMock, json } from '@/lib/server/guard';
import { currentAccount } from '@/lib/server/auth';
import { chargeEdit } from '@/lib/server/quota';
import { geminiEdit, geminiEnabled } from '@/lib/server/gemini';
import { TOUCHUP_WHOLE } from '@/lib/prompts';

export const maxDuration = 180;

/** Final touches with Gemini: the whole photo goes in; the app keeps only the cleaned-up edit areas. */
export async function POST(req: Request) {
  const blocked = guard(req, 'edit', 8);
  if (blocked) return blocked;
  if (!geminiEnabled() && !isMock()) return json({ error: 'GEMINI_API_KEY is not configured' }, 500);

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return json({ error: 'Invalid upload' }, 400);
  }
  const image = form.get('image');
  if (!(image instanceof Blob)) return json({ error: 'Missing image' }, 400);
  if (image.size > 8 * 1024 * 1024) return json({ error: 'Image too large' }, 413);

  const account = await currentAccount(req);
  const charge = await chargeEdit(req, account);
  if (!charge.ok) return json({ error: charge.message, code: 'LIMIT_REACHED' }, 429);

  if (isMock()) {
    await new Promise((r) => setTimeout(r, 800));
    return new Response(image, { headers: { 'content-type': image.type || 'image/jpeg', 'cache-control': 'no-store' } });
  }
  try {
    const out = await geminiEdit(image, TOUCHUP_WHOLE, req.signal);
    return new Response(out, { headers: { 'content-type': out.type, 'cache-control': 'no-store' } });
  } catch (e) {
    await charge.refund();
    console.error('gemini touchup', e);
    return json({ error: (e as Error).message || 'Touch-up failed' }, 502);
  }
}
