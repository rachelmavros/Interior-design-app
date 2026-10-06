export async function serpSearch(params: Record<string, string>) {
  const key = process.env.SERP_KEY;
  if (!key) throw new Error('SERP_KEY is not configured');
  const qs = new URLSearchParams({ ...params, api_key: key, hl: 'en', gl: 'us' });
  const res = await fetch(`https://serpapi.com/search.json?${qs}`, {
    signal: AbortSignal.timeout(45_000),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.error) {
    // SerpAPI reports "no results" as an error string; treat it as empty.
    if (typeof data.error === 'string' && /hasn't returned any results/i.test(data.error)) return {};
    throw new Error(data.error || `Search provider error (${res.status})`);
  }
  return data;
}

/** Google Lens needs a public URL, so the crop is parked on imgBB for 10 minutes. */
export async function hostTemporaryImage(base64: string): Promise<string> {
  const key = process.env.IMGBB_KEY;
  if (!key) throw new Error('IMGBB_KEY is not configured');
  const body = new URLSearchParams({ image: base64 });
  const res = await fetch(`https://api.imgbb.com/1/upload?expiration=600&key=${encodeURIComponent(key)}`, {
    method: 'POST',
    body,
    signal: AbortSignal.timeout(30_000),
  });
  const data = await res.json().catch(() => ({}));
  const url = data?.data?.url;
  if (!url) throw new Error('Image upload failed');
  return url;
}
