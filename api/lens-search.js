export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const SERP_KEY = process.env.SERP_KEY;
    const IMGBB_KEY = process.env.IMGBB_KEY;

    if (!SERP_KEY || !IMGBB_KEY) {
      return res.status(500).json({ error: 'Missing environment variables' });
    }

    const { imageBase64 } = req.body || {};

    if (!imageBase64) {
      return res.status(400).json({ error: 'Missing imageBase64' });
    }

    const imgbbParams = new URLSearchParams();
    imgbbParams.append('image', imageBase64);

    const imgbbRes = await fetch(
      `https://api.imgbb.com/1/upload?key=${IMGBB_KEY}`,
      {
        method: 'POST',
        body: imgbbParams
      }
    );

    const imgbbData = await imgbbRes.json();

    const publicUrl = imgbbData?.data?.url;

    if (!publicUrl) {
      throw new Error('imgBB upload failed');
    }

    const lensParams = new URLSearchParams({
      engine: 'google_lens',
      api_key: SERP_KEY,
      url: publicUrl,
      hl: 'en',
      gl: 'us'
    });

    const lensRes = await fetch(
      `https://serpapi.com/search.json?${lensParams}`
    );

    const lensData = await lensRes.json();

    const shopping = lensData.shopping_results || [];
    const visual = lensData.visual_matches || [];

    const results = [...shopping, ...visual].slice(0, 8);

    const products = results.map((r) => ({
      name: r.title || 'Product',
      price: r.price || '',
      source: r.source || '',
      link: r.product_link || r.link || '#',
      thumbnail: r.thumbnail || null
    }));

    return res.status(200).json({
      products
    });

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: error.message || 'Internal server error'
    });
  }
}
