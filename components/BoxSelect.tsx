'use client';

import { useRef } from 'react';
import type { Box } from '@/lib/types';

type Pt = { x: number; y: number };

/** Photo with drag-a-box selection; reports the box in the image's own pixels. */
export function BoxSelect({
  img,
  src,
  onBox,
  maxHeight,
}: {
  img: HTMLImageElement;
  src: string;
  onBox: (b: Box) => void;
  maxHeight?: string;
}) {
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
      style={maxHeight ? { maxHeight, width: 'fit-content', margin: '0 auto' } : undefined}
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
        if (b && b.w > 16 && b.h > 16) onBox(b);
        else {
          last.current = null;
          draw(null);
        }
      }}
    >
      <img src={src} alt="Your photo" draggable={false} style={maxHeight ? { maxHeight, width: 'auto' } : undefined} />
      <canvas ref={canvas} />
    </div>
  );
}
