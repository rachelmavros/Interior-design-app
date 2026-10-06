'use client';

import {
  IconArrowDown,
  IconArrowUp,
  IconBackground,
  IconCheck,
  IconExternalLink,
  IconFlipVertical,
  IconSparkles,
  IconTrash,
  IconX,
} from '@tabler/icons-react';
import {
  blendSticker,
  flattenSticker,
  removeSticker,
  reorderSticker,
  updateSticker,
  useStudio,
} from '@/lib/client/studio';
import { formatPrice } from '../ProductCard';
import { useEditCost } from './AiSettings';

export function SelectedSticker() {
  const selected = useStudio((s) => s.selected);
  const stickers = useStudio((s) => s.project?.stickers ?? []);
  const urls = useStudio((s) => s.urls);
  const busy = useStudio((s) => s.busy);
  const cost = useEditCost();
  const s = stickers.find((x) => x.id === selected);
  if (!s) return null;
  const hasCutout = s.blobId !== s.origBlobId;

  return (
    <div className="card selected-card">
      <div className="row">
        <img src={urls[s.cutout ? s.blobId : s.origBlobId]} alt="" />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="small" style={{ fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {s.label}
          </div>
          <div className="tiny muted">
            {s.product?.price ? formatPrice(s.product.price) : ''} {s.product?.source ? `· ${s.product.source}` : ''}
          </div>
        </div>
        <button className="icon-btn" onClick={() => useStudio.setState({ selected: null })} aria-label="Deselect">
          <IconX size={17} />
        </button>
      </div>
      <div className="selected-actions">
        <button className="btn btn-accent btn-sm" disabled={!!busy} onClick={() => blendSticker(s.id)} title="Re-render with your room’s lighting, perspective and shadows">
          <IconSparkles size={15} /> Blend with AI {cost && <span className="btn-cost">{cost}</span>}
        </button>
        <button className="btn btn-outline btn-sm" disabled={!!busy} onClick={() => flattenSticker(s.id)} title="Commit as-is, no AI">
          <IconCheck size={15} /> Place as-is
        </button>
      </div>
      <div className="selected-tools">
        <button className="icon-btn" title="Flip" aria-label="Flip" onClick={() => updateSticker(s.id, { flip: !s.flip })}>
          <IconFlipVertical size={18} style={{ transform: 'rotate(90deg)' }} />
        </button>
        <button className="icon-btn" title="Bring forward" aria-label="Bring forward" onClick={() => reorderSticker(s.id, 1)}>
          <IconArrowUp size={18} />
        </button>
        <button className="icon-btn" title="Send backward" aria-label="Send backward" onClick={() => reorderSticker(s.id, -1)}>
          <IconArrowDown size={18} />
        </button>
        <button
          className={`icon-btn ${!s.cutout ? 'active' : ''}`}
          title={hasCutout ? 'Toggle original background' : 'No clean cutout available'}
          aria-label="Toggle background"
          disabled={!hasCutout}
          onClick={() => updateSticker(s.id, { cutout: !s.cutout })}
        >
          <IconBackground size={18} />
        </button>
        {s.product && (
          <a className="icon-btn" href={s.product.link} target="_blank" rel="noopener noreferrer sponsored" title="Open product" aria-label="Open product">
            <IconExternalLink size={18} />
          </a>
        )}
        <button className="icon-btn btn-danger" title="Remove" aria-label="Remove" onClick={() => removeSticker(s.id)}>
          <IconTrash size={18} />
        </button>
      </div>
    </div>
  );
}
