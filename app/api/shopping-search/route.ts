import { guard, isMock, json } from '@/lib/server/guard';
import { mockProducts } from '@/lib/server/mock';
import { dedupe, normalize } from '@/lib/server/products';
import { serpSearch } from '@/lib/server/serp';
import type { Product } from '@/lib/types';

export const maxDuration = 60;

export async function GET(req: Request) {
  const blocked = guard(req, 'shopping', 40);
  if (blocked) return blocked;

  const { searchParams } = new URL(req.url);
  const q = (searchParams.get('q') || '').trim().slice(0, 200);
  const page = Math.max(0, Math.min(9, parseInt(searchParams.get('page') || '0', 10) || 0));
  if (!q) return json({ error: 'Missing search query' }, 400);

  if (isMock()) {
    return json({ products: mockProducts(`${q}:${page}`, 'shopping', 40), hasMore: page < 3 });
  }

  try {
    const params: Record<string, string> = { engine: 'google_shopping', q };
    if (page > 0) params.start = String(page * 60);
    const data = await serpSearch(params);
    const raw: any[] = [...(data.shopping_results || []), ...(data.inline_shopping_results || [])];
    const products = dedupe(
      raw.map((r, i) => normalize(r, 'shopping', page * 1000 + i)).filter((p): p is Product => p !== null),
    );
    return json({ products, hasMore: products.length >= 10 && page < 9 });
  } catch (e) {
    console.error('shopping-search', e);
    return json({ error: (e as Error).message || 'Search failed' }, 502);
  }
}
