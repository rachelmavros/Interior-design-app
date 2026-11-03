import type { InspoPhoto, Product, Story } from '../types';

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

function roomSvg(wall: string, floor: string, piece: string, label: string) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="1100"><rect width="900" height="760" fill="${wall}"/><rect y="760" width="900" height="340" fill="${floor}"/><rect x="560" y="180" width="200" height="260" fill="#f8f4ec" stroke="#d9cdbd" stroke-width="8"/><rect x="170" y="600" width="520" height="190" rx="50" fill="${piece}"/><rect x="170" y="520" width="520" height="130" rx="44" fill="${piece}" opacity=".85"/><text x="450" y="1060" font-family="sans-serif" font-size="34" text-anchor="middle" fill="#fff">${label}</text></svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
}

export function mockInspo(query: string, page: number): InspoPhoto[] {
  return Array.from({ length: 12 }, (_, i) => {
    const n = page * 12 + i;
    const src = roomSvg(COLORS[n % COLORS.length], COLORS[(n + 3) % COLORS.length], COLORS[(n + 5) % COLORS.length], `${query} ${n + 1}`);
    return {
      id: `mock-${query}-${n}`,
      src,
      full: src,
      width: 900,
      height: i % 3 ? 1100 : 700,
      color: COLORS[n % COLORS.length],
      alt: `${query} mock ${n + 1}`,
      author: 'Demo photographer',
      authorUrl: 'https://unsplash.com',
      sourceUrl: 'https://unsplash.com',
    };
  });
}

export function mockStories(): Story[] {
  return Array.from({ length: 6 }, (_, i) => ({
    title: ['Inside a sunlit Brooklyn brownstone', 'The 12 best paint colors of the year', 'A Japandi cabin in the woods', 'How to style a sideboard', 'Designers on the return of brown', 'A tiny kitchen, totally transformed'][i],
    link: 'https://www.architecturaldigest.com/',
    image: roomSvg(COLORS[i], COLORS[(i + 2) % COLORS.length], COLORS[(i + 4) % COLORS.length], 'AD'),
    date: new Date(Date.now() - i * 86400000).toUTCString(),
  }));
}
