import type { Box } from '../types';

export type Drawable = HTMLImageElement | HTMLCanvasElement;

export const dims = (s: Drawable) =>
  s instanceof HTMLImageElement ? { W: s.naturalWidth, H: s.naturalHeight } : { W: s.width, H: s.height };

export function makeCanvas(w: number, h: number) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w));
  c.height = Math.max(1, Math.round(h));
  return c;
}

export function ctx2d(c: HTMLCanvasElement) {
  return c.getContext('2d', { willReadFrequently: true })!;
}

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Could not load image'));
    img.src = src;
  });
}

export async function blobToImage(blob: Blob) {
  const url = URL.createObjectURL(blob);
  try {
    return await loadImage(url);
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function toBlob(c: HTMLCanvasElement, type = 'image/jpeg', quality = 0.92): Promise<Blob> {
  return new Promise((resolve, reject) =>
    c.toBlob((b) => (b ? resolve(b) : reject(new Error('Encoding failed'))), type, quality),
  );
}

/** Decodes a phone photo (respecting EXIF rotation) and caps its long side. */
export async function prepareUpload(file: Blob, maxSide = 2048): Promise<{ blob: Blob; width: number; height: number }> {
  let source: CanvasImageSource;
  let w: number;
  let h: number;
  try {
    const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' });
    source = bmp;
    w = bmp.width;
    h = bmp.height;
  } catch {
    const img = await blobToImage(file);
    source = img;
    w = img.naturalWidth;
    h = img.naturalHeight;
  }
  const scale = Math.min(1, maxSide / Math.max(w, h));
  const c = makeCanvas(w * scale, h * scale);
  const g = ctx2d(c);
  g.imageSmoothingQuality = 'high';
  g.drawImage(source, 0, 0, c.width, c.height);
  return { blob: await toBlob(c, 'image/jpeg', 0.92), width: c.width, height: c.height };
}

// ── Mask math ─────────────────────────────────────────────

/** Separable box blur on the alpha channel only; runs in O(pixels) regardless of radius. */
function blurAlpha(alpha: Float32Array, w: number, h: number, r: number) {
  if (r < 1) return alpha;
  const tmp = new Float32Array(alpha.length);
  const win = r * 2 + 1;
  for (let y = 0; y < h; y++) {
    const row = y * w;
    let sum = 0;
    for (let x = -r; x <= r; x++) sum += alpha[row + Math.min(w - 1, Math.max(0, x))];
    for (let x = 0; x < w; x++) {
      tmp[row + x] = sum / win;
      sum += alpha[row + Math.min(w - 1, x + r + 1)] - alpha[row + Math.max(0, x - r)];
    }
  }
  const out = new Float32Array(alpha.length);
  for (let x = 0; x < w; x++) {
    let sum = 0;
    for (let y = -r; y <= r; y++) sum += tmp[Math.min(h - 1, Math.max(0, y)) * w + x];
    for (let y = 0; y < h; y++) {
      out[y * w + x] = sum / win;
      sum += tmp[Math.min(h - 1, y + r + 1) * w + x] - tmp[Math.max(0, y - r) * w + x];
    }
  }
  return out;
}

function readAlpha(c: HTMLCanvasElement) {
  const d = ctx2d(c).getImageData(0, 0, c.width, c.height).data;
  const a = new Float32Array(c.width * c.height);
  for (let i = 0; i < a.length; i++) a[i] = d[i * 4 + 3] / 255;
  return a;
}

function alphaToCanvas(a: Float32Array, w: number, h: number) {
  const c = makeCanvas(w, h);
  const g = ctx2d(c);
  const img = g.createImageData(w, h);
  for (let i = 0; i < a.length; i++) {
    img.data[i * 4 + 3] = Math.round(Math.min(1, Math.max(0, a[i])) * 255);
  }
  g.putImageData(img, 0, 0);
  return c;
}

/** Grows the mask outward by ~r px. */
function dilate(a: Float32Array, w: number, h: number, r: number) {
  const b = blurAlpha(a, w, h, r);
  for (let i = 0; i < b.length; i++) b[i] = b[i] > 0.02 ? 1 : 0;
  return b;
}

export function maskBounds(mask: HTMLCanvasElement): Box | null {
  const { width: w, height: h } = mask;
  const d = ctx2d(mask).getImageData(0, 0, w, h).data;
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (d[(y * w + x) * 4 + 3] > 10) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }
  return x1 < 0 ? null : { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}

export function maskCoverage(mask: HTMLCanvasElement) {
  const d = ctx2d(mask).getImageData(0, 0, mask.width, mask.height).data;
  let n = 0;
  for (let i = 3; i < d.length; i += 16) if (d[i] > 10) n++;
  return n / (d.length / 16);
}

/**
 * Picks a request size that keeps the room's aspect ratio. gpt-image-2 takes
 * arbitrary sizes (multiples of 16); earlier models take three fixed sizes.
 */
export function pickSendSize(w: number, h: number, model: string) {
  const ratio = w / h;
  if (model.startsWith('gpt-image-2')) {
    const long = 1536;
    const r = Math.min(3, Math.max(1 / 3, ratio));
    const sw = r >= 1 ? long : Math.round((long * r) / 16) * 16;
    const sh = r >= 1 ? Math.round(long / r / 16) * 16 : long;
    return { w: sw, h: sh };
  }
  if (ratio > 1.2) return { w: 1536, h: 1024 };
  if (ratio < 0.83) return { w: 1024, h: 1536 };
  return { w: 1024, h: 1024 };
}

function edgeRadii(w: number, h: number) {
  const long = Math.max(w, h);
  return { grow: Math.max(3, Math.round(long * 0.006)), feather: Math.max(4, Math.round(long * 0.01)) };
}

/** Image + OpenAI-format mask (transparent = editable) at the request size. */
export async function buildEditInputs(base: Drawable, mask: HTMLCanvasElement, model: string) {
  const { W, H } = dims(base);
  const send = pickSendSize(W, H, model);
  const { grow, feather } = edgeRadii(W, H);

  // The model is allowed to repaint slightly beyond the user's mask so the
  // feathered seam we composite later lands on generated pixels.
  const grown = alphaToCanvas(dilate(readAlpha(mask), W, H, grow + feather * 2), W, H);

  const img = makeCanvas(send.w, send.h);
  const gi = ctx2d(img);
  gi.imageSmoothingQuality = 'high';
  gi.drawImage(base, 0, 0, send.w, send.h);

  const m = makeCanvas(send.w, send.h);
  const gm = ctx2d(m);
  gm.fillStyle = '#000';
  gm.fillRect(0, 0, send.w, send.h);
  gm.globalCompositeOperation = 'destination-out';
  gm.drawImage(grown, 0, 0, send.w, send.h);

  return {
    image: await toBlob(img, 'image/jpeg', 0.92),
    mask: await toBlob(m, 'image/png'),
    size: `${send.w}x${send.h}`,
  };
}

/**
 * Generated images drift slightly in color and exposure overall. Measuring
 * the drift on pixels that should be unchanged (outside the mask) and
 * correcting it keeps the pasted region from looking tinted.
 */
function colorGains(base: ImageData, result: ImageData, keep: Float32Array) {
  const s = [0, 0, 0];
  const r = [0, 0, 0];
  let n = 0;
  for (let i = 0; i < keep.length; i += 7) {
    if (keep[i] > 0) continue;
    const p = i * 4;
    for (let c = 0; c < 3; c++) {
      s[c] += base.data[p + c];
      r[c] += result.data[p + c];
    }
    n++;
  }
  if (n < 500) return [1, 1, 1];
  return s.map((v, c) => Math.min(1.15, Math.max(0.87, v / Math.max(1, r[c]))));
}

export async function compositeEdit(base: Drawable, result: HTMLImageElement, mask: HTMLCanvasElement) {
  const { W, H } = dims(base);
  const { grow, feather } = edgeRadii(W, H);

  const out = makeCanvas(W, H);
  const go = ctx2d(out);
  go.drawImage(base, 0, 0);
  const baseData = go.getImageData(0, 0, W, H);

  const layer = makeCanvas(W, H);
  const gl = ctx2d(layer);
  gl.imageSmoothingQuality = 'high';
  gl.drawImage(result, 0, 0, W, H);
  const resData = gl.getImageData(0, 0, W, H);

  const userMask = readAlpha(mask);
  const sentRegion = dilate(userMask, W, H, grow + feather * 2);
  const gains = colorGains(baseData, resData, sentRegion);

  const soft = blurAlpha(dilate(userMask, W, H, grow), W, H, feather);
  for (let i = 0; i < soft.length; i++) {
    const p = i * 4;
    const a = soft[i];
    if (a <= 0) continue;
    for (let c = 0; c < 3; c++) {
      const v = Math.min(255, resData.data[p + c] * gains[c]);
      baseData.data[p + c] = Math.round(baseData.data[p + c] * (1 - a) + v * a);
    }
  }
  go.putImageData(baseData, 0, 0);
  return toBlob(out, 'image/jpeg', 0.93);
}

// ── Crops & cutouts ───────────────────────────────────────

export function cropToBase64(img: Drawable, box: Box, maxPx = 1600) {
  const scale = Math.min(1, maxPx / Math.max(box.w, box.h));
  const c = makeCanvas(box.w * scale, box.h * scale);
  const g = ctx2d(c);
  g.imageSmoothingQuality = 'high';
  g.drawImage(img, box.x, box.y, box.w, box.h, 0, 0, c.width, c.height);
  return { base64: c.toDataURL('image/jpeg', 0.88).split(',')[1], dataUrl: c.toDataURL('image/jpeg', 0.8) };
}

export function padBox(b: Box, pad: number, W: number, H: number): Box {
  const x = Math.max(0, Math.round(b.x - b.w * pad));
  const y = Math.max(0, Math.round(b.y - b.h * pad));
  const x2 = Math.min(W, Math.round(b.x + b.w * (1 + pad)));
  const y2 = Math.min(H, Math.round(b.y + b.h * (1 + pad)));
  return { x, y, w: x2 - x, h: y2 - y };
}

/**
 * Retailer product shots are almost always on a plain studio background.
 * Flood-fill that background from the image border and make it transparent.
 * Returns null when the border isn't uniform enough to trust.
 */
export function removeBackground(img: Drawable, tolerance = 38): HTMLCanvasElement | null {
  const maxSide = 1024;
  const d0 = dims(img);
  const scale = Math.min(1, maxSide / Math.max(d0.W, d0.H));
  const W = Math.round(d0.W * scale);
  const H = Math.round(d0.H * scale);
  const c = makeCanvas(W, H);
  const g = ctx2d(c);
  g.drawImage(img, 0, 0, W, H);
  const data = g.getImageData(0, 0, W, H);
  const d = data.data;

  const border: number[] = [];
  for (let x = 0; x < W; x++) border.push(x, (H - 1) * W + x);
  for (let y = 0; y < H; y++) border.push(y * W, y * W + W - 1);

  const samples = border.filter((_, i) => i % 3 === 0).map((i) => [d[i * 4], d[i * 4 + 1], d[i * 4 + 2]]);
  const median = [0, 1, 2].map((ch) => {
    const v = samples.map((s) => s[ch]).sort((a, b) => a - b);
    return v[v.length >> 1];
  });
  const dist = (i: number) =>
    Math.hypot(d[i * 4] - median[0], d[i * 4 + 1] - median[1], d[i * 4 + 2] - median[2]);

  const uniform = samples.filter((s) => Math.hypot(s[0] - median[0], s[1] - median[1], s[2] - median[2]) < tolerance).length;
  if (uniform / samples.length < 0.6) return null;

  const bg = new Uint8Array(W * H);
  const stack: number[] = [];
  for (const i of border) {
    if (!bg[i] && dist(i) < tolerance) {
      bg[i] = 1;
      stack.push(i);
    }
  }
  while (stack.length) {
    const i = stack.pop()!;
    const x = i % W;
    const y = (i / W) | 0;
    const next = [x > 0 ? i - 1 : -1, x < W - 1 ? i + 1 : -1, y > 0 ? i - W : -1, y < H - 1 ? i + W : -1];
    for (const n of next) {
      if (n >= 0 && !bg[n] && dist(n) < tolerance) {
        bg[n] = 1;
        stack.push(n);
      }
    }
  }

  const alpha = new Float32Array(W * H);
  for (let i = 0; i < alpha.length; i++) alpha[i] = bg[i] ? 0 : 1;
  const smooth = blurAlpha(alpha, W, H, 1);
  let x0 = W, y0 = H, x1 = -1, y1 = -1;
  for (let i = 0; i < smooth.length; i++) {
    const a = Math.min(alpha[i], smooth[i] * 1.4);
    d[i * 4 + 3] = Math.round(a * 255);
    if (a > 0.1) {
      const x = i % W;
      const y = (i / W) | 0;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    }
  }
  if (x1 < 0 || (x1 - x0) * (y1 - y0) < W * H * 0.02) return null;
  g.putImageData(data, 0, 0);

  const out = makeCanvas(x1 - x0 + 1, y1 - y0 + 1);
  ctx2d(out).drawImage(c, x0, y0, out.width, out.height, 0, 0, out.width, out.height);
  return out;
}

/** Loads a remote product image through our proxy so it can be read back from a canvas. */
export function proxied(src: string) {
  if (src.startsWith('data:') || src.startsWith('blob:')) return src;
  return `/api/image-proxy?url=${encodeURIComponent(src)}`;
}
