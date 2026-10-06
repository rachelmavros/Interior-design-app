import { guard, isMock, json } from '@/lib/server/guard';
import { mockEditSvg } from '@/lib/server/mock';
import { buildPrompt } from '@/lib/prompts';
import type { EditMode, EditParams } from '@/lib/types';

export const maxDuration = 300;

const MODES: EditMode[] = ['clear', 'add', 'blend', 'custom'];
const QUALITIES = ['low', 'medium', 'high'];
const MAX_BYTES = 8 * 1024 * 1024;

/** Params we can drop and retry without if a given model rejects them. */
const OPTIONAL = ['input_fidelity', 'output_compression', 'output_format', 'size'];

function sniffType(buf: Buffer) {
  if (buf[0] === 0x89 && buf[1] === 0x50) return 'image/png';
  if (buf[0] === 0x52 && buf[1] === 0x49) return 'image/webp';
  return 'image/jpeg';
}

export async function POST(req: Request) {
  const blocked = guard(req, 'edit', 8);
  if (blocked) return blocked;

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return json({ error: 'Invalid upload' }, 400);
  }

  const image = form.get('image');
  const mask = form.get('mask');
  const reference = form.get('reference');
  const size = String(form.get('size') || 'auto');
  const quality = String(form.get('quality') || 'medium');
  let params: EditParams;
  try {
    params = JSON.parse(String(form.get('params') || '{}'));
  } catch {
    return json({ error: 'Invalid params' }, 400);
  }

  if (!(image instanceof Blob) || !(mask instanceof Blob)) return json({ error: 'Missing image or mask' }, 400);
  if (image.size > MAX_BYTES || mask.size > 4 * 1024 * 1024) return json({ error: 'Image too large' }, 413);
  if (reference instanceof Blob && reference.size > MAX_BYTES) return json({ error: 'Reference too large' }, 413);
  if (!MODES.includes(params.mode)) return json({ error: 'Unknown edit mode' }, 400);
  if (!QUALITIES.includes(quality)) return json({ error: 'Unknown quality' }, 400);
  if (!/^(auto|\d{3,4}x\d{3,4})$/.test(size)) return json({ error: 'Invalid size' }, 400);
  if (params.text && params.text.length > 600) return json({ error: 'Description is too long' }, 400);
  if ((params.mode === 'add' || params.mode === 'custom') && !params.text?.trim()) {
    return json({ error: 'Describe what you want first' }, 400);
  }

  const prompt = buildPrompt(params);

  if (isMock()) {
    const [w, h] = size === 'auto' ? [1536, 1024] : size.split('x').map(Number);
    await new Promise((r) => setTimeout(r, 1200));
    return new Response(mockEditSvg(w, h, params.text || params.mode), {
      headers: { 'content-type': 'image/svg+xml', 'cache-control': 'no-store' },
    });
  }

  const key = process.env.OPENAI_API_KEY;
  if (!key) return json({ error: 'OPENAI_API_KEY is not configured' }, 500);
  const model = process.env.OPENAI_IMAGE_MODEL || 'gpt-image-2';

  const fields: Record<string, string> = {
    model,
    prompt,
    n: '1',
    quality,
    size,
    output_format: 'jpeg',
    output_compression: '92',
  };
  // gpt-image-2 is always high-fidelity on inputs; earlier models need asking.
  if (/^gpt-image-1(\.5)?$/.test(model)) fields.input_fidelity = 'high';

  for (let attempt = 0; attempt < 4; attempt++) {
    const fd = new FormData();
    for (const [k, v] of Object.entries(fields)) fd.append(k, v);
    fd.append('image[]', image, 'room.jpg');
    if (reference instanceof Blob) fd.append('image[]', reference, 'product.png');
    fd.append('mask', mask, 'mask.png');

    let res: Response;
    try {
      res = await fetch('https://api.openai.com/v1/images/edits', {
        method: 'POST',
        headers: { Authorization: `Bearer ${key}` },
        body: fd,
        signal: AbortSignal.timeout(280_000),
      });
    } catch (e) {
      console.error('openai fetch', e);
      return json({ error: 'The image service took too long. Try again, or use Draft quality.' }, 504);
    }

    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      const b64 = data?.data?.[0]?.b64_json;
      if (!b64) return json({ error: 'No image returned' }, 502);
      const buf = Buffer.from(b64, 'base64');
      return new Response(new Uint8Array(buf), {
        headers: { 'content-type': sniffType(buf), 'cache-control': 'no-store' },
      });
    }

    const err = data?.error || {};
    const badParam: string | undefined = err.param;
    if (res.status === 400 && badParam && OPTIONAL.includes(badParam) && badParam in fields) {
      console.warn(`openai rejected ${badParam} for ${model}; retrying without it`);
      delete fields[badParam];
      if (badParam === 'output_format') delete fields.output_compression;
      continue;
    }

    console.error('openai error', res.status, err);
    if (err.code === 'moderation_blocked') {
      return json({ error: 'The image service declined this request. Try different wording.' }, 400);
    }
    if (res.status === 403 && /verif/i.test(err.message || '')) {
      return json({ error: 'Your OpenAI organization must be verified to use this image model (platform.openai.com → Settings → Organization).' }, 502);
    }
    return json({ error: err.message || `Image service error (${res.status})` }, 502);
  }
  return json({ error: 'Image service rejected the request' }, 502);
}
