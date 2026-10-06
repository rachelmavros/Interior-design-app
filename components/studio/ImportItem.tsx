'use client';

import { useEffect, useRef, useState } from 'react';
import { IconLink, IconPhotoUp } from '@tabler/icons-react';
import { BoxSelect } from '../BoxSelect';
import { linkPreview } from '@/lib/client/api';
import { ctx2d, loadImage, makeCanvas, prepareUpload, proxied, removeBackground } from '@/lib/client/image';
import { placeImage, toast, useStudio } from '@/lib/client/studio';
import type { Box, Product } from '@/lib/types';

interface Source {
  img: HTMLImageElement;
  src: string;
  label: string;
  product?: Product;
  revoke?: boolean;
}

export function ImportItem() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [link, setLink] = useState('');
  const [loading, setLoading] = useState(false);
  const [source, setSource] = useState<Source | null>(null);
  const busy = useStudio((s) => s.busy);

  async function fromFile(f: File) {
    setLoading(true);
    try {
      const { blob } = await prepareUpload(f, 2048);
      const src = URL.createObjectURL(blob);
      setSource({ img: await loadImage(src), src, label: f.name.replace(/\.[^.]+$/, '').slice(0, 60), revoke: true });
    } catch {
      toast('That image couldn’t be opened.', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function fromLink(e: React.FormEvent) {
    e.preventDefault();
    const url = link.trim();
    if (!url) return;
    setLoading(true);
    try {
      const data = await linkPreview(/^https?:\/\//i.test(url) ? url : `https://${url}`);
      const src = proxied(data.image);
      const img = await loadImage(src).catch(() => {
        throw new Error('Found the page but couldn’t load its photo. Save the photo and upload it instead.');
      });
      setSource({ img, src, label: data.product?.title || 'Linked item', product: data.product });
      setLink('');
    } catch (err) {
      toast((err as Error).message, 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card">
      <h3>Add your own piece</h3>
      <p className="tiny muted" style={{ margin: '2px 0 10px' }}>
        Artwork, a find from a store, a family heirloom — upload a photo or paste a link, select the item, and place it in your room.
      </p>
      <div className="stack" style={{ gap: 8 }}>
        <button className="btn btn-outline btn-block" disabled={loading || !!busy} onClick={() => fileRef.current?.click()}>
          <IconPhotoUp size={16} /> Upload a photo
        </button>
        <form className="row" onSubmit={fromLink}>
          <input
            className="input"
            value={link}
            onChange={(e) => setLink(e.target.value)}
            placeholder="Paste a product or image link"
            inputMode="url"
            aria-label="Product or image link"
          />
          <button className="btn btn-primary" type="submit" disabled={loading || !link.trim()} aria-label="Load link">
            {loading ? <span className="spinner" style={{ borderTopColor: '#fff' }} /> : <IconLink size={16} />}
          </button>
        </form>
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) fromFile(f);
          e.target.value = '';
        }}
      />
      {source && <SelectModal source={source} onClose={() => setSource(null)} />}
    </div>
  );
}

function SelectModal({ source, onClose }: { source: Source; onClose: () => void }) {
  const [box, setBox] = useState<Box | null>(null);
  const [label, setLabel] = useState(source.label);
  // Product photos are usually on plain backgrounds; artwork and room shots shouldn't be cut out.
  const [cutout, setCutout] = useState(Boolean(source.product));

  useEffect(
    () => () => {
      if (source.revoke) URL.revokeObjectURL(source.src);
    },
    [source],
  );

  async function add() {
    const { img } = source;
    const b = box || { x: 0, y: 0, w: img.naturalWidth, h: img.naturalHeight };
    const crop = makeCanvas(b.w, b.h);
    ctx2d(crop).drawImage(img, b.x, b.y, b.w, b.h, 0, 0, b.w, b.h);
    const cut = cutout ? removeBackground(crop) : null;
    if (cutout && !cut) toast('The background wasn’t plain enough to remove — placed as-is.', 'info');
    onClose();
    await placeImage(crop, cut, label.trim() || 'My item', source.product);
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="import-title" onClick={onClose}>
      <div className="modal modal-wide" onClick={(e) => e.stopPropagation()}>
        <h2 id="import-title">Select your piece</h2>
        <p className="small muted" style={{ marginBottom: 12 }}>
          {box ? 'Got it. Drag again to adjust.' : 'Drag a box around the item — or skip to use the whole image.'}
        </p>
        <BoxSelect img={source.img} src={source.src} onBox={setBox} maxHeight="50vh" />
        <div className="stack" style={{ marginTop: 14, gap: 10 }}>
          <div>
            <label className="label" htmlFor="import-name">Name</label>
            <input id="import-name" className="input" value={label} onChange={(e) => setLabel(e.target.value)} maxLength={160} />
          </div>
          <label className="check">
            <input type="checkbox" checked={cutout} onChange={(e) => setCutout(e.target.checked)} />
            Remove a plain background (good for product photos; leave off for artwork)
          </label>
        </div>
        <div className="row-end">
          <button className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={add}>
            {box ? 'Add selection to room' : 'Add whole image'}
          </button>
        </div>
      </div>
    </div>
  );
}
