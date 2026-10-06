'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { IconPalette, IconRefresh } from '@tabler/icons-react';
import { SiteHeader } from '@/components/SiteHeader';
import { PhotoPicker } from '@/components/PhotoPicker';
import { ProductResults } from '@/components/ProductResults';
import { SetupNotice } from '@/components/SetupNotice';
import { Disclosure } from '@/components/Disclosure';
import { lensSearch } from '@/lib/client/api';
import { createProject } from '@/lib/client/db';
import { cropToBase64, loadImage, prepareUpload } from '@/lib/client/image';
import type { Box, Product } from '@/lib/types';

type Pt = { x: number; y: number };

export default function ShopPage() {
  const router = useRouter();
  const [photo, setPhoto] = useState<{ blob: Blob; url: string; img: HTMLImageElement } | null>(null);
  const [preparing, setPreparing] = useState(false);
  const [preview, setPreview] = useState<string>();
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [results, setResults] = useState<{ products: Product[]; suggestedQuery?: string; key: number } | null>(null);
  const [error, setError] = useState<string>();

  useEffect(() => () => {
    if (photo) URL.revokeObjectURL(photo.url);
  }, [photo]);

  async function onFile(f: File) {
    setPreparing(true);
    try {
      const { blob } = await prepareUpload(f, 2400);
      const url = URL.createObjectURL(blob);
      setPhoto({ blob, url, img: await loadImage(url) });
      setResults(null);
      setStatus('idle');
      setPreview(undefined);
    } catch {
      setError('That photo couldn’t be opened.');
    } finally {
      setPreparing(false);
    }
  }

  async function search(box: Box) {
    if (!photo) return;
    const { base64, dataUrl } = cropToBase64(photo.img, box);
    setPreview(dataUrl);
    setStatus('loading');
    setError(undefined);
    try {
      const data = await lensSearch(base64);
      setResults({ products: data.products, suggestedQuery: data.suggestedQuery, key: Date.now() });
      setStatus(data.products.length ? 'done' : 'error');
      if (!data.products.length) setError('No matches — try a tighter box around one item.');
    } catch (e) {
      setError((e as Error).message);
      setStatus('error');
    }
  }

  async function designThis() {
    if (!photo) return;
    const p = await createProject('Shopped room', photo.blob, photo.img.naturalWidth, photo.img.naturalHeight);
    router.push(`/studio/${p.id}`);
  }

  return (
    <>
      <SiteHeader />
      <main className="page">
        <SetupNotice />
        {!photo ? (
          <div style={{ maxWidth: 620, margin: '48px auto 0' }}>
            <h1 className="display" style={{ fontSize: 40, lineHeight: 1.1, marginBottom: 10 }}>
              Shop anything in a photo
            </h1>
            <p className="muted" style={{ marginBottom: 20 }}>
              Upload any room photo — yours, a Pinterest pin, an AI render — box an item, and we’ll find it (or its lookalikes)
              across stores.
            </p>
            <PhotoPicker onFile={onFile} busy={preparing} title="Upload a photo" hint="Then drag a box around what you love" />
          </div>
        ) : (
          <div className="shop-layout">
            <div className="shop-left">
              <BoxSelect img={photo.img} src={photo.url} onBox={search} />
              <div className="row" style={{ marginTop: 10, justifyContent: 'space-between', flexWrap: 'wrap' }}>
                <span className="small muted">Drag a box around an item to search</span>
                <div className="row">
                  <button className="btn btn-ghost btn-sm" onClick={() => setPhoto(null)}>
                    <IconRefresh size={15} /> New photo
                  </button>
                  <button className="btn btn-outline btn-sm" onClick={designThis}>
                    <IconPalette size={15} /> Design this room
                  </button>
                </div>
              </div>
            </div>
            <div>
              {status === 'idle' && <div className="empty">Your matches will appear here.</div>}
              {status !== 'idle' && (
                <div className="lens-head">
                  {preview && <img src={preview} alt="Your selection" />}
                  <div>
                    <h3>Visually similar products</h3>
                    <span className="tiny muted">
                      {status === 'loading' ? 'Scanning with Google Lens…' : status === 'done' ? `${results?.products.length} matches` : ''}
                    </span>
                  </div>
                  {status === 'loading' && <span className="spinner" style={{ marginLeft: 'auto' }} />}
                </div>
              )}
              {error && <p className="small" style={{ color: 'var(--error)' }}>{error}</p>}
              {status === 'done' && results && (
                <ProductResults key={results.key} mode="lens" initial={results.products} suggestedQuery={results.suggestedQuery} pageSize={24} wide />
              )}
            </div>
          </div>
        )}
        <Disclosure />
      </main>
    </>
  );
}

function BoxSelect({ img, src, onBox }: { img: HTMLImageElement; src: string; onBox: (b: Box) => void }) {
  const wrap = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const start = useRef<Pt | null>(null);
  const last = useRef<Box | null>(null);

  const toImg = (e: React.PointerEvent): Pt => {
    const r = wrap.current!.getBoundingClientRect();
    return {
      x: Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)) * img.naturalWidth,
      y: Math.min(1, Math.max(0, (e.clientY - r.top) / r.height)) * img.naturalHeight,
    };
  };

  function draw(b: Box | null) {
    const c = canvas.current!;
    c.width = img.naturalWidth;
    c.height = img.naturalHeight;
    const g = c.getContext('2d')!;
    if (!b) return;
    g.fillStyle = 'rgba(31,27,22,.45)';
    g.fillRect(0, 0, c.width, c.height);
    g.clearRect(b.x, b.y, b.w, b.h);
    g.strokeStyle = '#fff';
    g.lineWidth = Math.max(2, c.width / 400);
    g.strokeRect(b.x, b.y, b.w, b.h);
  }

  const boxFrom = (a: Pt, b: Pt): Box => ({
    x: Math.round(Math.min(a.x, b.x)),
    y: Math.round(Math.min(a.y, b.y)),
    w: Math.round(Math.abs(a.x - b.x)),
    h: Math.round(Math.abs(a.y - b.y)),
  });

  return (
    <div
      className="box-select"
      ref={wrap}
      onPointerDown={(e) => {
        (e.target as Element).setPointerCapture(e.pointerId);
        start.current = toImg(e);
      }}
      onPointerMove={(e) => {
        if (!start.current) return;
        last.current = boxFrom(start.current, toImg(e));
        draw(last.current);
      }}
      onPointerUp={() => {
        const b = last.current;
        start.current = null;
        last.current = null;
        if (b && b.w > 16 && b.h > 16) onBox(b);
        else draw(null);
      }}
    >
      <img src={src} alt="Your photo" draggable={false} />
      <canvas ref={canvas} />
    </div>
  );
}
