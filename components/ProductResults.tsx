'use client';

import { useEffect, useMemo, useState } from 'react';
import { IconAdjustmentsHorizontal, IconBuildingStore, IconSearch } from '@tabler/icons-react';
import { shoppingSearch } from '@/lib/client/api';
import type { Product } from '@/lib/types';
import { ProductCard } from './ProductCard';

type Sort = 'relevance' | 'price-asc' | 'price-desc' | 'rating' | 'reviews';

interface Props {
  /** lens: starts from visual matches and can widen to more stores. search: text search. */
  mode: 'lens' | 'search';
  initial?: Product[];
  suggestedQuery?: string;
  onPlace?: (p: Product) => void;
  pageSize?: number;
  wide?: boolean;
  placeholder?: string;
  presetQuery?: string;
}

function mergeUnique(a: Product[], b: Product[]) {
  const seen = new Set(a.map((p) => p.link));
  return [...a, ...b.filter((p) => !seen.has(p.link) && seen.add(p.link))];
}

export function ProductResults({
  mode,
  initial = [],
  suggestedQuery = '',
  onPlace,
  pageSize = 12,
  wide,
  placeholder = 'Search sofas, rugs, lamps…',
  presetQuery,
}: Props) {
  const [products, setProducts] = useState<Product[]>(initial);
  const [query, setQuery] = useState(mode === 'lens' ? suggestedQuery : '');
  const [storeQuery, setStoreQuery] = useState<string | null>(null);
  const [storePage, setStorePage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [sort, setSort] = useState<Sort>('relevance');
  const [showFilters, setShowFilters] = useState(false);
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [minRating, setMinRating] = useState(0);
  const [inStock, setInStock] = useState(false);
  const [retailers, setRetailers] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(0);

  async function runSearch(q: string, nextPage: number) {
    const term = q.trim();
    if (!term) return;
    setLoading(true);
    setError(null);
    try {
      const data = await shoppingSearch(term, nextPage);
      setProducts((prev) => {
        if (mode === 'search' && nextPage === 0) return data.products;
        return mergeUnique(prev, data.products);
      });
      setStoreQuery(term);
      setStorePage(nextPage);
      setHasMore(Boolean(data.hasMore));
      if (mode === 'search' && nextPage === 0) setPage(0);
      if (!data.products.length && nextPage === 0) setError('No products found — try different words.');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (presetQuery) {
      setQuery(presetQuery);
      runSearch(presetQuery, 0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [presetQuery]);

  const allRetailers = useMemo(() => {
    const counts = new Map<string, number>();
    products.forEach((p) => p.source && counts.set(p.source, (counts.get(p.source) || 0) + 1));
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([r]) => r);
  }, [products]);

  const filtered = useMemo(() => {
    const lo = parseFloat(minPrice);
    const hi = parseFloat(maxPrice);
    const list = products.filter((p) => {
      if (!Number.isNaN(lo) && (p.price === null || p.price < lo)) return false;
      if (!Number.isNaN(hi) && (p.price === null || p.price > hi)) return false;
      if (minRating && (p.rating ?? 0) < minRating) return false;
      if (inStock && p.inStock === false) return false;
      if (retailers.size && !retailers.has(p.source)) return false;
      return true;
    });
    const priced = (p: Product, dir: 1 | -1) => (p.price === null ? Infinity : p.price * dir);
    switch (sort) {
      case 'price-asc':
        return [...list].sort((a, b) => priced(a, 1) - priced(b, 1));
      case 'price-desc':
        return [...list].sort((a, b) => priced(a, -1) - priced(b, -1));
      case 'rating':
        return [...list].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0) || (b.reviews ?? 0) - (a.reviews ?? 0));
      case 'reviews':
        return [...list].sort((a, b) => (b.reviews ?? 0) - (a.reviews ?? 0));
      default:
        return list;
    }
  }, [products, sort, minPrice, maxPrice, minRating, inStock, retailers]);

  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const current = Math.min(page, pages - 1);
  const visible = filtered.slice(current * pageSize, current * pageSize + pageSize);
  const activeFilters =
    Number(Boolean(minPrice)) + Number(Boolean(maxPrice)) + Number(minRating > 0) + Number(inStock) + Number(retailers.size > 0);

  useEffect(() => setPage(0), [sort, minPrice, maxPrice, minRating, inStock, retailers]);

  function clearFilters() {
    setMinPrice('');
    setMaxPrice('');
    setMinRating(0);
    setInStock(false);
    setRetailers(new Set());
  }

  const searchForm = (
    <form
      className="row"
      onSubmit={(e) => {
        e.preventDefault();
        runSearch(query, 0);
      }}
    >
      <input className="input" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={placeholder} />
      <button className="btn btn-primary" disabled={loading || !query.trim()} type="submit">
        {loading ? <span className="spinner" style={{ borderTopColor: '#fff' }} /> : <IconSearch size={16} />}
        <span className="sr-only">Search</span>
      </button>
    </form>
  );

  return (
    <div>
      {mode === 'search' && <div style={{ marginBottom: 12 }}>{searchForm}</div>}

      {products.length > 0 && (
        <>
          <div className="results-bar">
            <select className="select" value={sort} onChange={(e) => setSort(e.target.value as Sort)} aria-label="Sort">
              <option value="relevance">Best match</option>
              <option value="price-asc">Price: low to high</option>
              <option value="price-desc">Price: high to low</option>
              <option value="rating">Top rated</option>
              <option value="reviews">Most reviewed</option>
            </select>
            <button className={`btn btn-sm ${activeFilters ? 'btn-primary' : 'btn-outline'}`} onClick={() => setShowFilters((v) => !v)}>
              <IconAdjustmentsHorizontal size={15} /> Filters{activeFilters ? ` (${activeFilters})` : ''}
            </button>
            <span className="tiny muted" style={{ marginLeft: 'auto' }}>
              {filtered.length} of {products.length}
            </span>
          </div>

          {showFilters && (
            <div className="card filters">
              <div>
                <span className="label">Price</span>
                <div className="price-range">
                  <input className="input" inputMode="numeric" placeholder="Min" value={minPrice} onChange={(e) => setMinPrice(e.target.value.replace(/[^0-9.]/g, ''))} />
                  <span className="muted">–</span>
                  <input className="input" inputMode="numeric" placeholder="Max" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value.replace(/[^0-9.]/g, ''))} />
                </div>
              </div>
              <div>
                <span className="label">Rating</span>
                <select className="select" value={minRating} onChange={(e) => setMinRating(Number(e.target.value))}>
                  <option value={0}>Any rating</option>
                  <option value={3}>3★ & up</option>
                  <option value={4}>4★ & up</option>
                  <option value={4.5}>4.5★ & up</option>
                </select>
              </div>
              <div className="full">
                <span className="label">
                  <IconBuildingStore size={13} style={{ verticalAlign: -2 }} /> Retailers
                </span>
                <div className="retailer-list">
                  {allRetailers.map((r) => (
                    <button
                      key={r}
                      className={`chip ${retailers.has(r) ? 'on' : ''}`}
                      onClick={() =>
                        setRetailers((prev) => {
                          const next = new Set(prev);
                          next.has(r) ? next.delete(r) : next.add(r);
                          return next;
                        })
                      }
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>
              <label className="check">
                <input type="checkbox" checked={inStock} onChange={(e) => setInStock(e.target.checked)} /> In stock only
              </label>
              <div style={{ textAlign: 'right' }}>
                <button className="btn btn-ghost btn-sm" onClick={clearFilters} disabled={!activeFilters}>
                  Clear all
                </button>
              </div>
            </div>
          )}

          {visible.length ? (
            <div className={`grid ${wide ? 'wide' : ''}`}>
              {visible.map((p) => (
                <ProductCard key={p.id} p={p} onPlace={onPlace} />
              ))}
            </div>
          ) : (
            <div className="empty small">No products match these filters.</div>
          )}

          {pages > 1 && (
            <div className="pager">
              <button disabled={current === 0} onClick={() => setPage(current - 1)} aria-label="Previous page">
                ‹
              </button>
              {Array.from({ length: pages }, (_, i) => i)
                .filter((i) => i === 0 || i === pages - 1 || Math.abs(i - current) <= 1)
                .map((i, idx, arr) => (
                  <span key={i} className="row" style={{ gap: 4 }}>
                    {idx > 0 && i - arr[idx - 1] > 1 && <span className="muted">…</span>}
                    <button className={i === current ? 'on' : ''} onClick={() => setPage(i)}>
                      {i + 1}
                    </button>
                  </span>
                ))}
              <button disabled={current >= pages - 1} onClick={() => setPage(current + 1)} aria-label="Next page">
                ›
              </button>
            </div>
          )}

          {storeQuery && hasMore && (
            <div style={{ textAlign: 'center', marginTop: 8 }}>
              <button className="btn btn-outline btn-sm" disabled={loading} onClick={() => runSearch(storeQuery, storePage + 1)}>
                {loading ? <span className="spinner" /> : null} Load more products
              </button>
            </div>
          )}
        </>
      )}

      {mode === 'lens' && (
        <div className="card-soft more-stores">
          <div className="small" style={{ fontWeight: 600, marginBottom: 6 }}>
            {storeQuery ? 'Search again across stores' : 'Want more options & prices?'}
          </div>
          <div className="tiny muted" style={{ marginBottom: 8 }}>
            We’ll search every major retailer for this style. Edit the words to fine-tune.
          </div>
          {searchForm}
        </div>
      )}

      {error && <p className="small" style={{ color: 'var(--error)', marginTop: 10 }}>{error}</p>}
    </div>
  );
}
