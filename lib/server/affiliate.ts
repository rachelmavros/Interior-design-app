/**
 * Turns a retailer URL into an affiliate URL using whichever program is
 * configured. Amazon links get the Associates tag; everything else goes
 * through Sovrn Commerce, then Skimlinks. Unconfigured = link unchanged.
 */
export function affiliateLink(raw: string | undefined): string {
  if (!raw) return '#';
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return raw;
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return '#';

  const host = url.hostname.replace(/^www\./, '');
  // Google's own product pages aren't merchants; wrapping them earns nothing.
  if (/(^|\.)google\.[a-z.]+$/.test(host)) return url.toString();

  const amazonTag = process.env.AMAZON_ASSOCIATE_TAG;
  if (amazonTag && /(^|\.)amazon\.[a-z.]+$/.test(host)) {
    url.searchParams.set('tag', amazonTag);
    return url.toString();
  }

  const sovrn = process.env.SOVRN_API_KEY;
  if (sovrn) {
    return `https://redirect.viglink.com?key=${encodeURIComponent(sovrn)}&u=${encodeURIComponent(url.toString())}`;
  }

  const skim = process.env.SKIMLINKS_ID;
  if (skim) {
    return `https://go.skimresources.com?id=${encodeURIComponent(skim)}&xs=1&url=${encodeURIComponent(url.toString())}`;
  }

  return url.toString();
}
