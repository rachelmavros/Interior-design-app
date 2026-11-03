'use client';

import { useEffect, useRef, useState } from 'react';
import { IconLink, IconPhotoUp, IconX } from '@tabler/icons-react';
import { BoxSelect } from '../BoxSelect';
import { linkPreview } from '@/lib/client/api';
import { ctx2d, loadImage, makeCanvas, prepareUpload, proxied, toBlob } from '@/lib/client/image';
import { toast, useStudio } from '@/lib/client/studio';
import type { Box } from '@/lib/types';

export interface Inspo {
  blob: Blob;
  url: string;
}

/** Picks an inspiration photo (upload or link), optionally cropped to the part that matters. */
export function InspoAttach({ value, onChange }: { value: Inspo | null; onChange: (v: Inspo | null) => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [link, setLink] = useState('');
  const [loading, setLoading] = useState(false);
  const [picked, setPicked] = useState<{ img: HTMLImageElement; src: string; revoke?: boolean } | null>(null);
  const busy = useStudio((s) => s.busy);

  useEffect(() => () => {
    if (value) URL.revokeObjectURL(value.url);
  }, [value]);

  async function fromFile(f: File) {
    setLoading(true);
    try {
      const { blob } = await prepareUpload(f, 2048);
      const src = URL.createObjectURL(blob);
      setPicked({ img: await loadImage(src), src, revoke: true });
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
      setPicked({ img, src });
      setLink('');
    } catch (err) {
      toast((err as Error).message, 'error');
    } finally {
      setLoading(false);
    }
  }

  async function use(box: Box | null) {
    if (!picked) return;
    const { img } = picked;
    const b = box || { x: 0, y: 0, w: img.naturalWidth, h: img.naturalHeight };
    const scale = Math.min(1, 1024 / Math.max(b.w, b.h));
    const c = makeCanvas(b.w * scale, b.h * scale);
    const g = ctx2d(c);
    g.imageSmoothingQuality = 'high';
    g.drawImage(img, b.x, b.y, b.w, b.h, 0, 0, c.width, c.height);
    const blob = await toBlob(c, 'image/jpeg', 0.9);
    if (picked.revoke) URL.revokeObjectURL(picked.src);
    setPicked(null);
    onChange({ blob, url: URL.createObjectURL(blob) });
  }

  return (
    <div>
      <span className="label">Inspiration photo (optional)</span>
      {value ? (
        <div className="inspo-attached">
          <img src={value.url} alt="Your inspiration" />
          <span className="tiny muted">The AI will match this photo’s material, pattern and color.</span>
          <button className="icon-btn" aria-label="Remove inspiration photo" onClick={() => onChange(null)}>
            <IconX size={16} />
          </button>
        </div>
      ) : (
        <div className="stack" style={{ gap: 8 }}>
          <p className="tiny muted" style={{ margin: 0 }}>
            A tile, wallpaper, paint, fabric or piece you love — the AI uses it as the reference for the painted area.
          </p>
          <div className="row">
            <button className="btn btn-outline btn-sm" disabled={loading || !!busy} onClick={() => fileRef.current?.click()}>
              <IconPhotoUp size={15} /> Upload
            </button>
            <form className="row" style={{ flex: 1 }} onSubmit={fromLink}>
              <input
                className="input"
                value={link}
                onChange={(e) => setLink(e.target.value)}
                placeholder="or paste a link"
                inputMode="url"
                aria-label="Inspiration link"
              />
              <button className="btn btn-primary btn-sm" type="submit" disabled={loading || !link.trim()} aria-label="Load link">
                {loading ? <span className="spinner" style={{ borderTopColor: '#fff' }} /> : <IconLink size={15} />}
              </button>
            </form>
          </div>
        </div>
      )}
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
      {picked && <CropModal img={picked.img} src={picked.src} onUse={use} onClose={() => setPicked(null)} />}
    </div>
  );
}

function CropModal({ img, src, onUse, onClose }: { img: HTMLImageElement; src: string; onUse: (b: Box | null) => void; onClose: () => void }) {
  const [box, setBox] = useState<Box | null>(null);
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="inspo-title" onClick={onClose}>
      <div className="modal modal-wide" onClick={(e) => e.stopPropagation()}>
        <h2 id="inspo-title">Select the part you want</h2>
        <p className="small muted" style={{ marginBottom: 12 }}>
          {box ? 'Got it. Drag again to adjust.' : 'Drag a box around just the tile, pattern or piece — or use the whole image.'}
        </p>
        <BoxSelect img={img} src={src} onBox={setBox} maxHeight="50vh" />
        <div className="row-end">
          <button className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={() => onUse(box)}>
            {box ? 'Use selection' : 'Use whole image'}
          </button>
        </div>
      </div>
    </div>
  );
}
