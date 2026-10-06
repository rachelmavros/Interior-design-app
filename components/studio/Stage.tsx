'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  maskChanged,
  maskCtx,
  shopBox,
  snapshotMask,
  updateSticker,
  useStudio,
} from '@/lib/client/studio';
import type { Sticker } from '@/lib/client/db';
import { BusyOverlay } from './BusyOverlay';

type Pt = { x: number; y: number };

const HINTS: Record<string, string> = {
  brush: 'Paint over what you want to change',
  eraser: 'Erase parts of the painted area',
  rect: 'Drag a box to paint an area',
  lasso: 'Draw around an area to paint it',
  shop: 'Drag a box around anything to shop it',
};

export function Stage() {
  const project = useStudio((s) => s.project)!;
  const base = useStudio((s) => s.base);
  const mask = useStudio((s) => s.mask);
  const urls = useStudio((s) => s.urls);
  const tool = useStudio((s) => s.tool);
  const brush = useStudio((s) => s.brush);
  const selected = useStudio((s) => s.selected);
  const busy = useStudio((s) => s.busy);
  const compare = useStudio((s) => s.compare);
  const coverage = useStudio((s) => s.maskCoverage);

  const W = project.width;
  const H = project.height;
  const wrapRef = useRef<HTMLDivElement>(null);
  const surfaceRef = useRef<HTMLDivElement>(null);
  const maskHost = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const [fit, setFit] = useState({ w: 0, h: 0 });
  const [split, setSplit] = useState(50);

  const drag = useRef<{ kind: string; start: Pt; last: Pt; points: Pt[] } | null>(null);
  const scale = fit.w ? fit.w / W : 1;

  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const { width, height } = el.getBoundingClientRect();
      const s = Math.min(width / W, height / H);
      setFit({ w: Math.floor(W * s), h: Math.floor(H * s) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [W, H]);

  const showStage = fit.w > 0 && Boolean(base);
  useEffect(() => {
    const host = maskHost.current;
    if (!host || !mask) return;
    host.appendChild(mask);
    return () => {
      if (mask.parentNode === host) host.removeChild(mask);
    };
  }, [mask, showStage]);

  useEffect(() => {
    const c = overlayRef.current;
    if (!c) return;
    const dpr = window.devicePixelRatio || 1;
    c.width = fit.w * dpr;
    c.height = fit.h * dpr;
  }, [fit]);

  const toImg = (e: { clientX: number; clientY: number }): Pt => {
    const r = surfaceRef.current!.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * W, y: ((e.clientY - r.top) / r.height) * H };
  };

  function overlay() {
    const c = overlayRef.current!;
    const g = c.getContext('2d')!;
    const k = c.width / W;
    g.setTransform(k, 0, 0, k, 0, 0);
    g.clearRect(0, 0, W, H);
    return { g, k };
  }

  function drawPreview(cursor?: Pt) {
    const { g, k } = overlay();
    const d = drag.current;
    g.lineWidth = 2 / k;
    if (d && (d.kind === 'rect' || d.kind === 'shop')) {
      const b = boxOf(d.start, d.last);
      if (d.kind === 'shop') {
        g.fillStyle = 'rgba(31,27,22,.45)';
        g.fillRect(0, 0, W, H);
        g.clearRect(b.x, b.y, b.w, b.h);
        g.strokeStyle = '#fff';
      } else {
        g.fillStyle = 'rgba(255,79,123,.4)';
        g.fillRect(b.x, b.y, b.w, b.h);
        g.strokeStyle = '#ff4f7b';
      }
      g.setLineDash([6 / k, 4 / k]);
      g.strokeRect(b.x, b.y, b.w, b.h);
      g.setLineDash([]);
    }
    if (d && d.kind === 'lasso' && d.points.length > 1) {
      g.beginPath();
      d.points.forEach((p, i) => (i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y)));
      g.fillStyle = 'rgba(255,79,123,.25)';
      g.fill();
      g.strokeStyle = '#ff4f7b';
      g.stroke();
    }
    if (cursor && (tool === 'brush' || tool === 'eraser')) {
      g.beginPath();
      g.arc(cursor.x, cursor.y, brush / scale / 2, 0, Math.PI * 2);
      g.strokeStyle = '#fff';
      g.lineWidth = 2.5 / k;
      g.stroke();
      g.strokeStyle = tool === 'eraser' ? '#1f1b16' : '#ff4f7b';
      g.lineWidth = 1.2 / k;
      g.stroke();
    }
  }

  function onDown(e: React.PointerEvent) {
    if (busy || compare) return;
    if (tool === 'move') {
      useStudio.setState({ selected: null });
      return;
    }
    if (e.button !== 0) return;
    (e.target as Element).setPointerCapture(e.pointerId);
    const p = toImg(e);
    drag.current = { kind: tool, start: p, last: p, points: [p] };
    if (tool === 'brush' || tool === 'eraser') {
      snapshotMask();
      const g = maskCtx()!;
      g.globalCompositeOperation = tool === 'eraser' ? 'destination-out' : 'source-over';
      g.beginPath();
      g.arc(p.x, p.y, brush / scale / 2, 0, Math.PI * 2);
      g.fill();
    }
    drawPreview(p);
  }

  function onMove(e: React.PointerEvent) {
    if (busy || compare) return;
    const p = toImg(e);
    const d = drag.current;
    if (d) {
      if (d.kind === 'brush' || d.kind === 'eraser') {
        const g = maskCtx()!;
        g.globalCompositeOperation = d.kind === 'eraser' ? 'destination-out' : 'source-over';
        g.lineWidth = brush / scale;
        g.lineCap = 'round';
        g.lineJoin = 'round';
        g.beginPath();
        g.moveTo(d.last.x, d.last.y);
        g.lineTo(p.x, p.y);
        g.stroke();
      }
      if (d.kind === 'lasso') d.points.push(p);
      d.last = p;
    }
    drawPreview(p);
  }

  function onUp(e: React.PointerEvent) {
    const d = drag.current;
    drag.current = null;
    if (!d) return;
    const p = toImg(e);
    const g = maskCtx()!;
    if (d.kind === 'brush' || d.kind === 'eraser') {
      g.globalCompositeOperation = 'source-over';
      maskChanged();
    } else if (d.kind === 'rect') {
      const b = boxOf(d.start, p);
      if (b.w > 4 && b.h > 4) {
        snapshotMask();
        g.fillRect(b.x, b.y, b.w, b.h);
        maskChanged();
      }
    } else if (d.kind === 'lasso' && d.points.length > 2) {
      snapshotMask();
      g.beginPath();
      d.points.forEach((q, i) => (i ? g.lineTo(q.x, q.y) : g.moveTo(q.x, q.y)));
      g.closePath();
      g.fill();
      maskChanged();
    } else if (d.kind === 'shop') {
      const b = boxOf(d.start, p);
      shopBox({ x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.w), h: Math.round(b.h) });
    }
    drawPreview(e.pointerType === 'mouse' ? p : undefined);
  }

  function onCompare(e: React.PointerEvent) {
    if (!compare || (e.buttons !== 1 && e.type !== 'pointerdown')) return;
    if (e.type === 'pointerdown') (e.target as Element).setPointerCapture(e.pointerId);
    const r = surfaceRef.current!.getBoundingClientRect();
    setSplit(Math.min(100, Math.max(0, ((e.clientX - r.left) / r.width) * 100)));
  }

  const original = urls[project.versions[0].id];
  const showHint = !compare && !busy && tool !== 'move' && (tool === 'shop' || coverage === 0);

  return (
    <div className="stage-wrap" ref={wrapRef} style={{ '--ar': `${W} / ${H}` } as React.CSSProperties}>
      {showStage && base && (
        <div className={`stage ${busy ? 'shimmer' : ''}`} style={{ width: fit.w, height: fit.h }}>
          <img className="stage-img" src={base.src} alt="Your room" draggable={false} />
          <div className="mask-host" ref={maskHost} style={{ display: compare ? 'none' : undefined }} />
          <canvas className="overlay" ref={overlayRef} />

          {!compare &&
            project.stickers.map((s) => (
              <StickerView
                key={s.id}
                s={s}
                src={urls[s.cutout ? s.blobId : s.origBlobId]}
                scale={scale}
                selected={selected === s.id}
                interactive={tool === 'move' && !busy}
                surface={surfaceRef}
              />
            ))}

          {compare && original && (
            <>
              <div className="compare-clip" style={{ clipPath: `inset(0 ${100 - split}% 0 0)` }}>
                <img src={original} alt="Original room" />
              </div>
              <div className="compare-handle" style={{ left: `${split}%` }}>
                <span>⟷</span>
              </div>
              <div className="compare-labels">
                <span>Original</span>
                <span>Now</span>
              </div>
            </>
          )}

          <div
            ref={surfaceRef}
            className={`surface t-${compare ? 'compare' : tool}`}
            style={{
              zIndex: tool === 'move' && !compare ? 0 : 3,
              cursor: compare ? 'ew-resize' : undefined,
            }}
            onPointerDown={compare ? onCompare : onDown}
            onPointerMove={compare ? onCompare : onMove}
            onPointerUp={compare ? undefined : onUp}
            onPointerCancel={() => {
              drag.current = null;
              drawPreview();
            }}
            onPointerLeave={() => !drag.current && drawPreview()}
          />

          {showHint && <div className="stage-hint">{HINTS[tool]}</div>}
          {busy && <BusyOverlay label={busy.label} startedAt={busy.startedAt} />}
        </div>
      )}
    </div>
  );
}

function boxOf(a: Pt, b: Pt) {
  return { x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), w: Math.abs(a.x - b.x), h: Math.abs(a.y - b.y) };
}

function StickerView({
  s,
  src,
  scale,
  selected,
  interactive,
  surface,
}: {
  s: Sticker;
  src?: string;
  scale: number;
  selected: boolean;
  interactive: boolean;
  surface: React.RefObject<HTMLDivElement | null>;
}) {
  const op = useRef<{ kind: 'move' | 'resize' | 'rotate'; px: number; py: number; s: Sticker; d0: number; a0: number } | null>(null);

  function center() {
    const r = surface.current!.getBoundingClientRect();
    return { cx: r.left + s.x * scale, cy: r.top + s.y * scale };
  }

  function start(kind: 'move' | 'resize' | 'rotate') {
    return (e: React.PointerEvent) => {
      if (!interactive) return;
      e.stopPropagation();
      (e.currentTarget as Element).setPointerCapture(e.pointerId);
      useStudio.setState({ selected: s.id });
      const { cx, cy } = center();
      op.current = {
        kind,
        px: e.clientX,
        py: e.clientY,
        s,
        d0: Math.hypot(e.clientX - cx, e.clientY - cy),
        a0: (Math.atan2(e.clientY - cy, e.clientX - cx) * 180) / Math.PI,
      };
    };
  }

  function move(e: React.PointerEvent) {
    const o = op.current;
    if (!o) return;
    e.stopPropagation();
    if (o.kind === 'move') {
      updateSticker(s.id, { x: o.s.x + (e.clientX - o.px) / scale, y: o.s.y + (e.clientY - o.py) / scale }, false);
    } else {
      const r = surface.current!.getBoundingClientRect();
      const cx = r.left + o.s.x * scale;
      const cy = r.top + o.s.y * scale;
      if (o.kind === 'resize') {
        const k = Math.max(0.08, Math.hypot(e.clientX - cx, e.clientY - cy) / Math.max(1, o.d0));
        updateSticker(s.id, { w: o.s.w * k, h: o.s.h * k }, false);
      } else {
        let a = o.s.rotation + (Math.atan2(e.clientY - cy, e.clientX - cx) * 180) / Math.PI - o.a0;
        a = ((a + 540) % 360) - 180;
        if (Math.abs(a) < 4) a = 0;
        updateSticker(s.id, { rotation: a }, false);
      }
    }
  }

  function end(e: React.PointerEvent) {
    if (!op.current) return;
    e.stopPropagation();
    op.current = null;
    updateSticker(s.id, {}, true);
  }

  return (
    <div
      className={`sticker ${interactive ? 'interactive' : ''} ${selected && interactive ? 'selected' : ''}`}
      style={{
        left: (s.x - s.w / 2) * scale,
        top: (s.y - s.h / 2) * scale,
        width: s.w * scale,
        height: s.h * scale,
        transform: `rotate(${s.rotation}deg)`,
        zIndex: 2,
        pointerEvents: interactive ? 'auto' : 'none',
      }}
      onPointerDown={start('move')}
      onPointerMove={move}
      onPointerUp={end}
      onPointerCancel={end}
    >
      {src && <img src={src} alt={s.label} style={{ transform: s.flip ? 'scaleX(-1)' : undefined }} draggable={false} />}
      {selected && interactive && (
        <>
          <div className="handle resize" onPointerDown={start('resize')} onPointerMove={move} onPointerUp={end} />
          <div className="handle rotate" onPointerDown={start('rotate')} onPointerMove={move} onPointerUp={end} />
        </>
      )}
    </div>
  );
}
