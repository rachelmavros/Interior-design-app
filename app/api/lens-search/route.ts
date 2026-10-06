import { guard, isMock, json } from '@/lib/server/guard';
import { mockProducts } from '@/lib/server/mock';
import { dedupe, normalize, suggestQuery } from '@/lib/server/products';
import { hostTemporaryImage, serpSearch } from '@/lib/server/serp';
import type { Product } from '@/lib/types';

export const maxDuration = 60;

export async function POST(req: Request) {
  const blocked = guard(req, 'lens', 20);
  if (blocked) return blocked;

  const { imageBase64 } = await req.json().catch(() => ({}));
  if (typeof imageBase64 !== 'string' || imageBase64.length < 100) {
    return json({ error: 'Missing image' }, 400);
  }

  if (isMock()) {
    const products = mockProducts(imageBase64.slice(-64), 'lens', 36);
    return json({ products, suggestedQuery: 'boucle accent chair' });
  }

  try {
    const url = await hostTemporaryImage(imageBase64);
    const data = await serpSearch({ engine: 'google_lens', url });

    const raw: any[] = [
      ...(data.shopping_results || []),
      ...(data.products || []),
      ...(data.visual_matches || []),
    ];
    const products = dedupe(
      raw.map((r, i) => normalize(r, 'lens', i)).filter((p): p is Product => p !== null),
    );
    // Results with a price are almost always shoppable listings; surface them first.
    products.sort((a, b) => Number(b.price !== null) - Number(a.price !== null));

    return json({ products, suggestedQuery: suggestQuery(products) });
  } catch (e) {
    console.error('lens-search', e);
    return json({ error: (e as Error).message || 'Search failed' }, 502);
  }
}
