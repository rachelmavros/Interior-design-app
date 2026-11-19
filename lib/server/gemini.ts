/**
 * Gemini image editing ("Nano Banana"). Unlike masked edit models, it takes
 * an instruction and returns the same photo with just that change, which is
 * what a gentle clean-up needs.
 */
export const geminiModel = () => process.env.GEMINI_IMAGE_MODEL || 'gemini-2.5-flash-image';
export const geminiEnabled = () => Boolean(process.env.GEMINI_API_KEY);

/** Edits keep the input photo's shape, so no aspect ratio is forced (that could stretch it out of line). */
export async function geminiEdit(image: Blob, prompt: string, signal: AbortSignal): Promise<Blob> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('GEMINI_API_KEY is not configured');
  const data = Buffer.from(await image.arrayBuffer()).toString('base64');
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(geminiModel())}:generateContent`;

  const body = {
    contents: [{ role: 'user', parts: [{ text: prompt }, { inline_data: { mime_type: image.type || 'image/jpeg', data } }] }],
    generationConfig: { responseModalities: ['IMAGE'] },
  };
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'x-goog-api-key': key, 'content-type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.any([signal, AbortSignal.timeout(150_000)]),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.error?.message || `Gemini error (${res.status})`);
  const parts: any[] = json?.candidates?.[0]?.content?.parts || [];
  const img = parts.find((p) => p.inlineData?.data || p.inline_data?.data);
  if (!img) {
    const why = json?.candidates?.[0]?.finishReason || json?.promptFeedback?.blockReason;
    throw new Error(why ? `Gemini didn’t return an image (${why}). Try again.` : 'Gemini didn’t return an image. Try again.');
  }
  const inline = img.inlineData || img.inline_data;
  return new Blob([Buffer.from(inline.data, 'base64')], { type: inline.mimeType || inline.mime_type || 'image/png' });
}
