'use client';

import { useState } from 'react';
import { placeProduct } from '@/lib/client/studio';
import { ProductResults } from '../ProductResults';
import { ImportItem } from './ImportItem';

const CATEGORIES = ['Sofa', 'Accent chair', 'Coffee table', 'Area rug', 'Floor lamp', 'Side table', 'Sideboard', 'Bookshelf', 'Bed frame', 'Dining chairs', 'Wall art', 'Plant'];

export function ProductsPanel() {
  const [preset, setPreset] = useState<string | undefined>();

  return (
    <div className="stack">
      <ImportItem />
      <div>
        <h3>Try products from stores</h3>
        <p className="tiny muted" style={{ marginTop: 2 }}>
          Search any store, hit “Try in room”, then drag it into place. “Blend with AI” matches your lighting and adds shadows.
        </p>
      </div>
      <div className="chips">
        {CATEGORIES.map((c) => (
          <button key={c} className={`chip ${preset === c.toLowerCase() ? 'on' : ''}`} onClick={() => setPreset(c.toLowerCase())}>
            {c}
          </button>
        ))}
      </div>
      <ProductResults mode="search" onPlace={placeProduct} presetQuery={preset} />
    </div>
  );
}
