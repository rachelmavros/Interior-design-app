import type { Product } from '../types';

const RETAILERS = ['Wayfair', 'West Elm', 'Target', 'Article', 'Crate & Barrel', 'IKEA', 'Amazon', 'CB2'];
const ITEMS = [
  'Bouclé Accent Chair',
  'Walnut Coffee Table',
  'Linen Sofa 84"',
  'Arched Floor Lamp',
  'Jute Area Rug 8x10',
  'Fluted Sideboard',
  'Ceramic Table Lamp',
  'Rattan Lounge Chair',
];
const COLORS = ['#c8b8a6', '#8a9a7b', '#d9c3a5', '#6b5b4e', '#b9a18b', '#9fb1bc', '#e0d6c8', '#7c6a5c'];

function swatch(color: string, label: string) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400"><rect width="400" height="400" fill="#ffffff"/><rect x="70" y="120" width="260" height="170" rx="28" fill="${color}"/><rect x="95" y="290" width="16" height="50" fill="#5b4a3e"/><rect x="289" y="290" width="16" height="50" fill="#5b4a3e"/><text x="200" y="380" font-family="sans-serif" font-size="18" text-anchor="middle" fill="#999">${label}</text></svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
}

export function mockProducts(seed: string, origin: Product['origin'], count = 30): Product[] {
  let h = 0;
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return Array.from({ length: count }, (_, i) => {
    const n = (h + i * 7919) >>> 0;
    const title = `${ITEMS[n % ITEMS.length]} — ${['Oak', 'Ivory', 'Sage', 'Charcoal', 'Natural'][n % 5]}`;
    const price = 49 + (n % 1400);
    const img = swatch(COLORS[n % COLORS.length], ITEMS[n % ITEMS.length]);
    return {
      id: `${origin}-mock-${seed.length}-${i}`,
      title,
      link: `https://example.com/product/${n}`,
      source: RETAILERS[n % RETAILERS.length],
      thumbnail: img,
      image: img,
      price,
      priceText: `$${price}`,
      oldPrice: n % 4 === 0 ? price + 60 : null,
      rating: n % 5 === 0 ? null : 3 + ((n % 20) / 10),
      reviews: n % 5 === 0 ? null : n % 2400,
      inStock: n % 7 !== 0,
      origin,
    };
  });
}

/** A visible stand-in for an AI edit so the compositing pipeline can be tested without a key. */
export function mockEditSvg(width: number, height: number, label: string) {
  const safe = label.replace(/[<>&"]/g, '').slice(0, 60);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
  <defs><pattern id="p" width="48" height="48" patternUnits="userSpaceOnUse" patternTransform="rotate(30)">
  <rect width="48" height="48" fill="#e9dccb"/><rect width="24" height="48" fill="#dccab3"/></pattern></defs>
  <rect width="100%" height="100%" fill="url(#p)"/>
  <text x="50%" y="50%" font-family="sans-serif" font-size="${Math.round(width / 28)}" text-anchor="middle" fill="#7a6650">MOCK EDIT: ${safe}</text>
</svg>`;
}
