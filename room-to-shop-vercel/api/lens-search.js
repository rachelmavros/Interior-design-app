export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const SERP_KEY  = process.env.SERP_KEY;
  const IMGBB_KEY = process.env.IMGBB_KEY;

  if (!SERP_KEY || !IMGBB_KEY) {
    return res.status(500).json({ error: 'API keys not configured' });
  }

  const { imageBase64 } = req.body;
  if (!imageBase64) {
    return res.status(400).json({ error: 'Missing imageBase64' });
  }

  try {
    // Step 1: Upload to imgBB
    const imgbbParams = new URLSearchParams();
    imgbbParams.append('image', imageBase64);
    imgbbParams.append('expiration', '600');

    const imgbbRes = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_KEY}`, {
      method: 'POST',
      body: imgbbParams
    });
    if (!imgbbRes.ok) throw new Error(`imgBB upload failed: ${await imgbbRes.text()}`);
    const imgbbData = await imgbbRes.json();
    const publicUrl = imgbbData.data?.url;
    if (!publicUrl) throw new Error('imgBB did not return a URL');

    // Step 2: Google Lens via SerpAPI
    const lensParams = new URLSearchParams({
      engine:  'google_lens',
      api_key: SERP_KEY,
      url:     publicUrl,
      hl:      'en',
      country: 'us'
    });

    const lensRes = await fetch(`https://serpapi.com/search.json?${lensParams}`);
    if (!lensRes.ok) {
      const err = await lensRes.json().catch(() => ({}));
      throw new Error(err.error || `SerpAPI error ${lensRes.status}`);
    }
    const lensData = await lensRes.json();

    const shopping = lensData.shopping_results || [];
    const visual   = lensData.visual_matches   || [];
    let products   = [];

    if (shopping.length) {
      products = shopping.slice(0, 8).map(r => ({
        name:      r.title,
        price:     r.price || '',
        source:    r.source || extractDomain(r.link),
        link:      r.product_link || r.link,
        thumbnail: r.thumbnail || null
      }));
    } else if (visual.length) {
      products = visual.slice(0, 8).map(r => ({
        name:      r.title,
        price:     r.price || '',
        source:    r.source || extractDomain(r.link),
        link:      r.link,
        thumbnail: r.thumbnail || r.image?.link || null
      }));
    }

    return res.status(200).json({ products, count: products.length });

  } catch(e) {
    console.error('lens-search error:', e.message);
    return res.status(500).json({ error: e.message });
  }
}

function extractDomain(url) {
  try { return new URL(url).hostname.replace('www.', ''); } catch { return ''; }
}
