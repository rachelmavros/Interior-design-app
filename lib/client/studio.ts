'use client';

import { create } from 'zustand';
import { designEdit, getConfig, lensSearch } from './api';
import {
  blobToImage,
  buildEditInputs,
  compositeEdit,
  cropToBase64,
  ctx2d,
  dims,
  loadImage,
  makeCanvas,
  maskBounds,
  maskCoverage,
  padBox,
  proxied,
  removeBackground,
  toBlob,
  type Drawable,
} from './image';
import {
  deleteBlob,
  getBlob,
  loadProject,
  putBlob,
  saveProject,
  uid,
  type DesignItem,
  type Project,
  type Sticker,
} from './db';
import type { Box, EditParams, Product } from '../types';

export type Tool = 'move' | 'brush' | 'eraser' | 'rect' | 'lasso' | 'shop';
export type Tab = 'design' | 'products' | 'shop';
export type Quality = 'low' | 'medium' | 'high';

export interface LensState {
  status: 'idle' | 'loading' | 'done' | 'error';
  products: Product[];
  suggestedQuery?: string;
  error?: string;
  preview?: string;
  label?: string;
  key: number;
}

interface Toast {
  id: number;
  msg: string;
  kind: 'info' | 'error' | 'success';
  action?: { label: string; run: () => void };
}

interface State {
  project: Project | null;
  loadError: string | null;
  urls: Record<string, string>;
  base: HTMLImageElement | null;
  mask: HTMLCanvasElement | null;
  maskRev: number;
  maskCoverage: number;
  maskHistory: ImageData[];
  tool: Tool;
  brush: number;
  tab: Tab;
  quality: Quality;
  selected: string | null;
  busy: { label: string; startedAt: number } | null;
  compare: boolean;
  lens: LensState;
  toast: Toast | null;
  model: string;
}

const MASK_COLOR = '#ff4f7b';

const initial: State = {
  project: null,
  loadError: null,
  urls: {},
  base: null,
  mask: null,
  maskRev: 0,
  maskCoverage: 0,
  maskHistory: [],
  tool: 'brush',
  brush: 36,
  tab: 'design',
  quality: 'medium',
  selected: null,
  busy: null,
  compare: false,
  lens: { status: 'idle', products: [], key: 0 },
  toast: null,
  model: 'gpt-image-2',
};

export const useStudio = create<State>(() => initial);
const set = useStudio.setState;
const get = useStudio.getState;

let toastTimer: ReturnType<typeof setTimeout> | undefined;
export function toast(msg: string, kind: Toast['kind'] = 'info', action?: Toast['action']) {
  clearTimeout(toastTimer);
  set({ toast: { id: Date.now(), msg, kind, action } });
  toastTimer = setTimeout(() => set({ toast: null }), action ? 9000 : 5000);
}

/** On phones the stage and panel are stacked; bring the relevant one into view. */
function reveal(selector: '.stage-wrap' | '.studio-side') {
  if (typeof window === 'undefined' || window.innerWidth > 960) return;
  requestAnimationFrame(() =>
    document.querySelector(selector)?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
  );
}

// ── Persistence ───────────────────────────────────────────

let saveTimer: ReturnType<typeof setTimeout> | undefined;
function persist(immediate = false) {
  clearTimeout(saveTimer);
  const run = () => {
    const p = get().project;
    if (p) saveProject(p).catch((e) => console.error('save failed', e));
  };
  if (immediate) run();
  else saveTimer = setTimeout(run, 400);
}

function patchProject(patch: Partial<Project>, immediate = false) {
  const p = get().project;
  if (!p) return;
  set({ project: { ...p, ...patch, updatedAt: Date.now() } });
  persist(immediate);
}

async function urlFor(blobId: string) {
  const existing = get().urls[blobId];
  if (existing) return existing;
  const blob = await getBlob(blobId);
  if (!blob) throw new Error('Missing image data');
  const url = URL.createObjectURL(blob);
  set({ urls: { ...get().urls, [blobId]: url } });
  return url;
}

async function storeBlob(blob: Blob) {
  const id = uid();
  await putBlob(id, blob);
  set({ urls: { ...get().urls, [id]: URL.createObjectURL(blob) } });
  return id;
}

function forgetBlob(id: string) {
  const urls = { ...get().urls };
  if (urls[id]) URL.revokeObjectURL(urls[id]);
  delete urls[id];
  set({ urls });
  deleteBlob(id).catch(() => {});
}

// ── Lifecycle ─────────────────────────────────────────────

let loadToken = 0;

export async function loadStudio(id: string) {
  unloadStudio();
  const token = ++loadToken;
  try {
    const [project, config] = await Promise.all([loadProject(id), getConfig()]);
    if (token !== loadToken) return;
    if (!project) throw new Error('This project was not found on this device.');
    const urls: Record<string, string> = {};
    const ids = [...project.versions.map((v) => v.id), ...project.stickers.flatMap((s) => [s.blobId, s.origBlobId])];
    for (const blobId of new Set(ids)) {
      const blob = await getBlob(blobId);
      if (blob) urls[blobId] = URL.createObjectURL(blob);
    }
    if (token !== loadToken) {
      Object.values(urls).forEach((u) => URL.revokeObjectURL(u));
      return;
    }
    const base = await loadImage(urls[project.versions[project.current].id]);
    if (token !== loadToken) return;
    set({ project, urls, model: config.model, base, mask: makeCanvas(project.width, project.height) });
  } catch (e) {
    if (token === loadToken) set({ loadError: (e as Error).message });
  }
}

export function unloadStudio() {
  loadToken++;
  clearTimeout(saveTimer);
  if (get().project) persist(true);
  Object.values(get().urls).forEach((u) => URL.revokeObjectURL(u));
  set({ ...initial, lens: { ...initial.lens, key: Date.now() } });
}

// ── Versions ──────────────────────────────────────────────

async function commitVersion(blob: Blob, label: string, item?: Omit<DesignItem, 'id' | 'versionId'>) {
  const p = get().project!;
  const id = await storeBlob(blob);
  const dropped = p.versions.slice(p.current + 1);
  dropped.forEach((v) => forgetBlob(v.id));
  const droppedIds = new Set(dropped.map((v) => v.id));
  const versions = [...p.versions.slice(0, p.current + 1), { id, label, createdAt: Date.now() }];
  const items = p.items.filter((i) => !droppedIds.has(i.versionId));
  const newItem = item ? { ...item, id: uid(), versionId: id } : undefined;
  if (newItem) items.push(newItem);
  const base = await loadImage(get().urls[id]);
  set({ base });
  patchProject({ versions, current: versions.length - 1, items }, true);
  return newItem;
}

export async function goToVersion(index: number) {
  const p = get().project;
  if (!p || index < 0 || index >= p.versions.length || index === p.current) return;
  const base = await loadImage(await urlFor(p.versions[index].id));
  set({ base });
  patchProject({ current: index }, true);
}

export function flushSave() {
  if (get().project) persist(true);
}

export const undo = () => goToVersion((get().project?.current ?? 0) - 1);
export const redo = () => goToVersion((get().project?.current ?? 0) + 1);

/** Items stay shoppable only while the version that introduced them is in view. */
export function visibleItems(p: Project) {
  const live = new Set(p.versions.slice(0, p.current + 1).map((v) => v.id));
  return p.items.filter((i) => live.has(i.versionId));
}

// ── Mask ──────────────────────────────────────────────────

export function maskCtx() {
  const m = get().mask;
  if (!m) return null;
  const g = ctx2d(m);
  g.fillStyle = MASK_COLOR;
  g.strokeStyle = MASK_COLOR;
  return g;
}

export function snapshotMask() {
  const m = get().mask;
  if (!m) return;
  const snap = ctx2d(m).getImageData(0, 0, m.width, m.height);
  set({ maskHistory: [...get().maskHistory.slice(-14), snap] });
}

export function maskChanged() {
  const m = get().mask;
  set({ maskRev: get().maskRev + 1, maskCoverage: m ? maskCoverage(m) : 0 });
}

export function undoMask() {
  const { mask, maskHistory } = get();
  const last = maskHistory[maskHistory.length - 1];
  if (!mask || !last) return;
  ctx2d(mask).putImageData(last, 0, 0);
  set({ maskHistory: maskHistory.slice(0, -1) });
  maskChanged();
}

export function clearMask() {
  const m = get().mask;
  if (!m) return;
  snapshotMask();
  ctx2d(m).clearRect(0, 0, m.width, m.height);
  maskChanged();
}

export function invertMask() {
  const m = get().mask;
  if (!m) return;
  snapshotMask();
  const g = ctx2d(m);
  const img = g.getImageData(0, 0, m.width, m.height);
  for (let i = 0; i < img.data.length; i += 4) {
    img.data[i] = 255;
    img.data[i + 1] = 79;
    img.data[i + 2] = 123;
    img.data[i + 3] = 255 - img.data[i + 3];
  }
  g.putImageData(img, 0, 0);
  maskChanged();
}

// ── AI edits ──────────────────────────────────────────────

function busy(label: string) {
  set({ busy: { label, startedAt: Date.now() } });
}

function editLabel(p: EditParams) {
  const t = (p.text || '').trim();
  const short = t.length > 40 ? `${t.slice(0, 40)}…` : t;
  if (p.mode === 'clear') return short ? `Removed ${short}` : 'Cleared area';
  if (p.mode === 'add') return `Added ${short}`;
  if (p.mode === 'blend') return `Placed ${short}`;
  return short || 'Custom edit';
}

async function runMaskedEdit(source: Drawable, mask: HTMLCanvasElement, params: EditParams, reference?: Blob) {
  const { model, quality } = get();
  const inputs = await buildEditInputs(source, mask, model);
  const resultBlob = await designEdit({ ...inputs, quality, params, reference });
  const result = await blobToImage(resultBlob);
  return compositeEdit(source, result, mask);
}

export async function runEdit(params: EditParams) {
  const { base, mask, busy: isBusy } = get();
  if (!base || !mask || isBusy) return;
  if (maskCoverage(mask) === 0) {
    toast('Paint over the area you want to change first.', 'error');
    set({ tool: 'brush' });
    return;
  }
  const box = maskBounds(mask)!;
  busy(params.mode === 'clear' ? 'Clearing the space' : params.mode === 'add' ? 'Designing your piece' : 'Applying your edit');
  reveal('.stage-wrap');
  try {
    const out = await runMaskedEdit(base, mask, params);
    const item = await commitVersion(
      out,
      editLabel(params),
      params.mode === 'add' ? { kind: 'generated', label: params.text!.trim(), box } : undefined,
    );
    clearMask();
    set({ maskHistory: [] });
    if (item) {
      toast('Done! Want to find this piece in stores?', 'success', { label: 'Shop it', run: () => shopItem(item) });
    } else {
      toast('Done. Use the history strip to compare or undo.', 'success');
    }
  } catch (e) {
    toast((e as Error).message, 'error');
  } finally {
    set({ busy: null });
  }
}

// ── Shopping ──────────────────────────────────────────────

export async function shopBox(box: Box, label?: string) {
  const { base, project } = get();
  if (!base || !project) return;
  if (box.w < 12 || box.h < 12) {
    toast('That selection is too small — drag a bigger box.', 'error');
    return;
  }
  const { base64, dataUrl } = cropToBase64(base, box);
  const key = Date.now();
  set({ tab: 'shop', lens: { status: 'loading', products: [], preview: dataUrl, label, key } });
  reveal('.studio-side');
  try {
    const data = await lensSearch(base64);
    if (get().lens.key !== key) return;
    set({
      lens: {
        status: 'done',
        products: data.products,
        suggestedQuery: data.suggestedQuery,
        preview: dataUrl,
        label,
        key,
      },
    });
  } catch (e) {
    if (get().lens.key !== key) return;
    set({ lens: { status: 'error', products: [], error: (e as Error).message, preview: dataUrl, label, key } });
  }
}

export function shopItem(item: DesignItem) {
  const p = get().project!;
  shopBox(padBox(item.box, 0.04, p.width, p.height), item.label);
}

// ── Product stickers ──────────────────────────────────────

async function fetchProductImage(product: Product) {
  const sources = [product.image, product.thumbnail].filter(Boolean) as string[];
  for (const src of sources) {
    try {
      return await loadImage(proxied(src));
    } catch {}
  }
  throw new Error('Could not load this product’s photo.');
}

export async function placeProduct(product: Product) {
  const { project, busy: isBusy } = get();
  if (!project || isBusy) return;
  busy('Cutting out product');
  try {
    const img = await fetchProductImage(product);
    const orig = makeCanvas(img.naturalWidth, img.naturalHeight);
    ctx2d(orig).drawImage(img, 0, 0);
    const cut = removeBackground(img);
    const origBlobId = await storeBlob(await toBlob(orig, 'image/png'));
    const blobId = cut ? await storeBlob(await toBlob(cut, 'image/png')) : origBlobId;
    const shape = cut || orig;

    const W = project.width;
    const H = project.height;
    let w = W * 0.3;
    let h = (w * shape.height) / shape.width;
    if (h > H * 0.55) {
      h = H * 0.55;
      w = (h * shape.width) / shape.height;
    }
    const sticker: Sticker = {
      id: uid(),
      blobId,
      origBlobId,
      cutout: Boolean(cut),
      x: W / 2,
      y: Math.min(H - h / 2, H * 0.62),
      w,
      h,
      rotation: 0,
      flip: false,
      label: product.title,
      product,
    };
    patchProject({ stickers: [...get().project!.stickers, sticker] }, true);
    set({ selected: sticker.id, tool: 'move' });
    reveal('.stage-wrap');
    toast(
      cut
        ? 'Drag to place it, use the corner to resize. Then “Blend with AI” for real lighting & shadows.'
        : 'Placed with its background (it wasn’t a plain studio shot). “Blend with AI” will integrate it.',
      'success',
    );
  } catch (e) {
    toast((e as Error).message, 'error');
  } finally {
    set({ busy: null });
  }
}

export function updateSticker(id: string, patch: Partial<Sticker>, save = true) {
  const p = get().project;
  if (!p) return;
  set({ project: { ...p, stickers: p.stickers.map((s) => (s.id === id ? { ...s, ...patch } : s)) } });
  if (save) persist();
}

export function reorderSticker(id: string, dir: 1 | -1) {
  const list = [...get().project!.stickers];
  const i = list.findIndex((s) => s.id === id);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= list.length) return;
  [list[i], list[j]] = [list[j], list[i]];
  patchProject({ stickers: list });
}

export function removeSticker(id: string, keepBlobs = false) {
  const p = get().project!;
  const s = p.stickers.find((x) => x.id === id);
  if (!s) return;
  if (!keepBlobs) {
    forgetBlob(s.blobId);
    if (s.origBlobId !== s.blobId) forgetBlob(s.origBlobId);
  }
  patchProject({ stickers: p.stickers.filter((x) => x.id !== id) }, true);
  if (get().selected === id) set({ selected: null });
}

function drawSticker(g: CanvasRenderingContext2D, s: Sticker, img: CanvasImageSource) {
  g.save();
  g.translate(s.x, s.y);
  g.rotate((s.rotation * Math.PI) / 180);
  g.scale(s.flip ? -1 : 1, 1);
  g.drawImage(img, -s.w / 2, -s.h / 2, s.w, s.h);
  g.restore();
}

function stickerBox(s: Sticker, W: number, H: number): Box {
  const rad = (s.rotation * Math.PI) / 180;
  const bw = Math.abs(s.w * Math.cos(rad)) + Math.abs(s.h * Math.sin(rad));
  const bh = Math.abs(s.w * Math.sin(rad)) + Math.abs(s.h * Math.cos(rad));
  const x = Math.max(0, s.x - bw / 2);
  const y = Math.max(0, s.y - bh / 2);
  return { x, y, w: Math.min(W, s.x + bw / 2) - x, h: Math.min(H, s.y + bh / 2) - y };
}

async function flattened(s: Sticker) {
  const { base } = get();
  const { W, H } = dims(base!);
  const c = makeCanvas(W, H);
  const g = ctx2d(c);
  g.drawImage(base!, 0, 0);
  const img = await loadImage(get().urls[s.cutout ? s.blobId : s.origBlobId]);
  drawSticker(g, s, img);
  return c;
}

/** Commits the sticker into the photo as-is (free, instant). */
export async function flattenSticker(id: string) {
  const s = get().project?.stickers.find((x) => x.id === id);
  if (!s || get().busy) return;
  const c = await flattened(s);
  const { W, H } = dims(c);
  await commitVersion(await toBlob(c, 'image/jpeg', 0.93), `Placed ${s.label.slice(0, 40)}`, {
    kind: 'product',
    label: s.label,
    box: stickerBox(s, W, H),
    product: s.product,
  });
  removeSticker(id);
}

/** Re-renders the pasted product with the room's perspective, light and shadows. */
export async function blendSticker(id: string) {
  const s = get().project?.stickers.find((x) => x.id === id);
  if (!s || get().busy) return;
  busy('Blending into your room');
  reveal('.stage-wrap');
  try {
    const composed = await flattened(s);
    const { W, H } = dims(composed);
    const m = makeCanvas(W, H);
    const g = ctx2d(m);
    g.fillStyle = MASK_COLOR;
    g.save();
    g.translate(s.x, s.y);
    g.rotate((s.rotation * Math.PI) / 180);
    // Extra room below the piece for its contact shadow.
    g.fillRect(-s.w * 0.56, -s.h * 0.56, s.w * 1.12, s.h * 1.2);
    g.restore();

    const reference = await getBlob(s.origBlobId);
    const out = await runMaskedEdit(composed, m, { mode: 'blend', text: s.label.slice(0, 120) }, reference);
    await commitVersion(out, `Placed ${s.label.slice(0, 40)}`, {
      kind: 'product',
      label: s.label,
      box: stickerBox(s, W, H),
      product: s.product,
    });
    removeSticker(id);
    toast('Blended in. Compare with the history strip below.', 'success');
  } catch (e) {
    toast((e as Error).message, 'error');
  } finally {
    set({ busy: null });
  }
}

export function renameProject(name: string) {
  patchProject({ name: name.slice(0, 80) || 'Untitled room' });
}
