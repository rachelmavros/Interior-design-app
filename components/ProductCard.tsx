'use client';

import { useEffect, useState } from 'react';
import { IconExternalLink, IconHeart, IconHeartFilled, IconPhoto, IconSofa } from '@tabler/icons-react';
import { loadLibrary, recordView, toggleSaved, useLibrary } from '@/lib/client/library';
import type { Product } from '@/lib/types';

export function formatPrice(n: number | null | undefined) {
  if (n === null || n === undefined) return '';
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: n < 100 ? 2 : 0 });
}

function Stars({ value }: { value: number }) {
  const full = Math.round(value * 2) / 2;
  return (
    <span className="stars" aria-hidden>
      {'★★★★★'.slice(0, Math.floor(full))}
      {full % 1 ? '½' : ''}
    </span>
  );
}

export function ProductCard({
  p,
  onPlace,
  footer,
}: {
  p: Product;
  onPlace?: (p: Product) => void;
  footer?: React.ReactNode;
}) {
  const [broken, setBroken] = useState(false);
  const saved = useLibrary((l) => l.saved.some((s) => s.product.link === p.link));
  useEffect(() => {
    loadLibrary();
  }, []);
  const viewed = () => recordView(p);
  const sale = p.oldPrice && p.price && p.oldPrice > p.price ? Math.round((1 - p.price / p.oldPrice) * 100) : 0;

  return (
    <div className="pcard">
      <button
        className={`psave ${saved ? 'on' : ''}`}
        onClick={() => toggleSaved(p)}
        aria-label={saved ? 'Remove from saved' : 'Save'}
        aria-pressed={saved}
        title={saved ? 'Saved' : 'Save for later'}
      >
        {saved ? <IconHeartFilled size={17} /> : <IconHeart size={17} />}
      </button>
      <a className="pthumb" href={p.link} target="_blank" rel="noopener noreferrer sponsored" onClick={viewed}>
        {p.thumbnail && !broken ? (
          <img src={p.thumbnail} alt="" loading="lazy" referrerPolicy="no-referrer" onError={() => setBroken(true)} />
        ) : (
          <IconPhoto size={30} color="#c9bfb2" />
        )}
        {p.inStock === false ? (
          <span className="pbadge oos">Out of stock</span>
        ) : sale >= 5 ? (
          <span className="pbadge sale">−{sale}%</span>
        ) : null}
      </a>
      <div className="pinfo">
        <div className="psource">
          {p.sourceIcon && <img src={p.sourceIcon} alt="" referrerPolicy="no-referrer" />}
          <span>{p.source}</span>
        </div>
        <a className="ptitle" href={p.link} target="_blank" rel="noopener noreferrer sponsored" style={{ textDecoration: 'none' }} onClick={viewed}>
          {p.title}
        </a>
        <div className="pprice">
          {p.price !== null ? formatPrice(p.price) : p.priceText || <span className="na">See price at store</span>}
          {sale >= 5 && <s>{formatPrice(p.oldPrice)}</s>}
        </div>
        {p.rating ? (
          <div className="prating">
            <Stars value={p.rating} /> {p.rating.toFixed(1)}
            {p.reviews ? <span className="muted">({p.reviews.toLocaleString()})</span> : null}
          </div>
        ) : null}
        {p.delivery && <div className="tiny muted">{p.delivery}</div>}
        <div className="pactions">
          {onPlace && (
            <button
              className="btn btn-outline"
              onClick={() => {
                viewed();
                onPlace(p);
              }}
              title="Try it in your room"
            >
              <IconSofa size={15} /> Try in room
            </button>
          )}
          <a className="btn btn-primary" href={p.link} target="_blank" rel="noopener noreferrer sponsored" onClick={viewed}>
            Shop <IconExternalLink size={13} />
          </a>
        </div>
        {footer}
      </div>
    </div>
  );
}
