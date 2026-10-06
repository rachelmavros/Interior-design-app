'use client';

import { create } from 'zustand';
import type { AppConfig, EditParams, Product, ProductSearchResponse } from '../types';

const CODE_KEY = 'rts-access-code';

function readCode() {
  try {
    return localStorage.getItem(CODE_KEY) || '';
  } catch {
    return '';
  }
}

/** Drives the access-code modal: requestCode() opens it and resolves on submit/cancel. */
export const useAccessGate = create<{
  open: boolean;
  resolve: ((code: string | null) => void) | null;
  wrong: boolean;
}>(() => ({ open: false, resolve: null, wrong: false }));

function requestCode(wrong: boolean): Promise<string | null> {
  return new Promise((resolve) => {
    useAccessGate.setState({
      open: true,
      wrong,
      resolve: (code) => {
        useAccessGate.setState({ open: false, resolve: null });
        if (code) {
          try {
            localStorage.setItem(CODE_KEY, code);
          } catch {}
        }
        resolve(code);
      },
    });
  });
}

async function call(input: string, init: RequestInit = {}): Promise<Response> {
  let wrong = false;
  for (;;) {
    const headers = new Headers(init.headers);
    const code = readCode();
    if (code) headers.set('x-access-code', code);
    const res = await fetch(input, { ...init, headers });
    if (res.status !== 401) return res;
    const body = await res.clone().json().catch(() => ({}));
    if (body.code !== 'ACCESS_REQUIRED') return res;
    const entered = await requestCode(wrong || Boolean(code));
    if (!entered) throw new Error('An access code is needed to use this feature.');
    wrong = true;
  }
}

async function jsonOrThrow<T>(res: Response): Promise<T> {
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.error) throw new Error(data.error || `Request failed (${res.status})`);
  return data as T;
}

let configPromise: Promise<AppConfig> | null = null;
export function getConfig(): Promise<AppConfig> {
  configPromise ??= fetch('/api/config')
    .then((r) => r.json())
    .catch(() => ({ model: 'gpt-image-1-mini', models: ['gpt-image-1-mini'], amazon: false, mock: false, accessRequired: false, missing: [] }));
  return configPromise;
}

export async function lensSearch(imageBase64: string) {
  const res = await call('/api/lens-search', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ imageBase64 }),
  });
  return jsonOrThrow<ProductSearchResponse>(res);
}

export async function shoppingSearch(q: string, page = 0) {
  const res = await call(`/api/shopping-search?q=${encodeURIComponent(q)}&page=${page}`);
  return jsonOrThrow<ProductSearchResponse>(res);
}

export async function designEdit(opts: {
  image: Blob;
  mask: Blob;
  size: string;
  quality: string;
  model: string;
  params: EditParams;
  reference?: Blob;
}): Promise<Blob> {
  const fd = new FormData();
  fd.append('image', opts.image, 'room.jpg');
  fd.append('mask', opts.mask, 'mask.png');
  if (opts.reference) fd.append('reference', opts.reference, 'product.png');
  fd.append('size', opts.size);
  fd.append('quality', opts.quality);
  fd.append('model', opts.model);
  fd.append('params', JSON.stringify(opts.params));
  const res = await call('/api/design/edit', { method: 'POST', body: fd });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `Edit failed (${res.status})`);
  }
  return res.blob();
}

export async function linkPreview(url: string) {
  const res = await call(`/api/link-preview?url=${encodeURIComponent(url)}`);
  return jsonOrThrow<{ image: string; product?: Product }>(res);
}
