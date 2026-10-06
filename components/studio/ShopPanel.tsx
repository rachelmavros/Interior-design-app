'use client';

import { IconExternalLink, IconShoppingBagSearch, IconSparkles } from '@tabler/icons-react';
import { placeProduct, shopItem, useStudio, visibleItems } from '@/lib/client/studio';
import type { DesignItem } from '@/lib/client/db';
import { ProductResults } from '../ProductResults';
import { formatPrice } from '../ProductCard';

export function ShopPanel() {
  const project = useStudio((s) => s.project)!;
  const base = useStudio((s) => s.base);
  const lens = useStudio((s) => s.lens);
  const urls = useStudio((s) => s.urls);
  const items = visibleItems(project);
  const pending = project.stickers.filter((s) => s.product);

  const priced = [...items.map((i) => i.product), ...pending.map((s) => s.product)].filter(
    (p) => p?.price,
  );
  const total = priced.reduce((sum, p) => sum + (p!.price || 0), 0);

  function cropStyle(i: DesignItem): React.CSSProperties {
    if (!base) return {};
    const k = 54 / Math.max(i.box.w, i.box.h);
    return {
      backgroundImage: `url(${base.src})`,
      backgroundSize: `${project.width * k}px ${project.height * k}px`,
      backgroundPosition: `${-i.box.x * k + (54 - i.box.w * k) / 2}px ${-i.box.y * k + (54 - i.box.h * k) / 2}px`,
    };
  }

  return (
    <div className="stack">
      <button className="btn btn-outline btn-block" onClick={() => useStudio.setState({ tool: 'shop', compare: false })}>
        <IconShoppingBagSearch size={17} /> Select anything in the photo to shop it
      </button>

      {lens.status !== 'idle' && (
        <div>
          <div className="lens-head">
            {lens.preview && <img src={lens.preview} alt="Your selection" />}
            <div>
              <h3>{lens.label ? `Shop: ${lens.label}` : 'Visually similar products'}</h3>
              <span className="tiny muted">
                {lens.status === 'loading'
                  ? 'Scanning with Google Lens…'
                  : lens.status === 'done'
                    ? `${lens.products.length} matches across stores`
                    : 'Search failed'}
              </span>
            </div>
            {lens.status === 'loading' && <span className="spinner" style={{ marginLeft: 'auto' }} />}
          </div>
          {lens.status === 'error' && <p className="small" style={{ color: 'var(--error)' }}>{lens.error}</p>}
          {lens.status === 'done' && (
            <ProductResults
              key={lens.key}
              mode="lens"
              initial={lens.products}
              suggestedQuery={lens.suggestedQuery}
              onPlace={placeProduct}
            />
          )}
        </div>
      )}

      <div className="card">
        <h3>In this design</h3>
        {items.length === 0 && pending.length === 0 ? (
          <p className="tiny muted" style={{ marginTop: 6 }}>
            Pieces you add with AI or place from stores will show up here, ready to shop.
          </p>
        ) : (
          <div>
            {items.map((i) => (
              <div className="item-row" key={i.id}>
                {i.product?.thumbnail ? (
                  <img className="item-thumb" src={i.product.thumbnail} alt="" referrerPolicy="no-referrer" />
                ) : (
                  <div className="item-thumb" style={cropStyle(i)} />
                )}
                <div className="item-info">
                  <strong>{i.label}</strong>
                  <span className="tiny muted">
                    {i.kind === 'generated' ? (
                      <>
                        <IconSparkles size={11} style={{ verticalAlign: -1 }} /> AI design
                      </>
                    ) : (
                      [formatPrice(i.product?.price), i.product?.source].filter(Boolean).join(' · ')
                    )}
                  </span>
                </div>
                {i.product ? (
                  <a className="btn btn-primary btn-sm" href={i.product.link} target="_blank" rel="noopener noreferrer sponsored">
                    Shop <IconExternalLink size={13} />
                  </a>
                ) : (
                  <button className="btn btn-accent btn-sm" onClick={() => shopItem(i)}>
                    Find it
                  </button>
                )}
              </div>
            ))}
            {pending.map((s) => (
              <div className="item-row" key={s.id}>
                <img className="item-thumb" src={urls[s.blobId]} alt="" />
                <div className="item-info">
                  <strong>{s.label}</strong>
                  <span className="tiny muted">
                    {[formatPrice(s.product?.price), s.product?.source, 'not placed yet'].filter(Boolean).join(' · ')}
                  </span>
                </div>
                <a className="btn btn-primary btn-sm" href={s.product!.link} target="_blank" rel="noopener noreferrer sponsored">
                  Shop <IconExternalLink size={13} />
                </a>
              </div>
            ))}
            {total > 0 && (
              <div className="total-row">
                <span>Estimated total</span>
                <span>{formatPrice(total)}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
