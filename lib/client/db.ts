import { createStore, del, get, keys, set } from 'idb-keyval';
import type { Box, Product } from '../types';

export interface Version {
  id: string;
  label: string;
  createdAt: number;
}

export interface Sticker {
  id: string;
  /** Cutout shown in the room. */
  blobId: string;
  /** Untouched product photo, used as the AI reference and for "keep background". */
  origBlobId: string;
  cutout: boolean;
  x: number;
  y: number;
  w: number;
  h: number;
  rotation: number;
  flip: boolean;
  label: string;
  product?: Product;
}

export interface DesignItem {
  id: string;
  kind: 'generated' | 'product';
  label: string;
  box: Box;
  versionId: string;
  product?: Product;
}

export interface Project {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  width: number;
  height: number;
  versions: Version[];
  current: number;
  stickers: Sticker[];
  items: DesignItem[];
}

const store = typeof indexedDB !== 'undefined' ? createStore('room-to-shop', 'data') : undefined;

export const uid = () =>
  (typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
  ).replace(/-/g, '').slice(0, 16);

export const putBlob = (id: string, blob: Blob) => set(`blob:${id}`, blob, store);
export const getBlob = (id: string) => get<Blob>(`blob:${id}`, store);
export const deleteBlob = (id: string) => del(`blob:${id}`, store);

export const saveProject = (p: Project) => set(`project:${p.id}`, { ...p, updatedAt: Date.now() }, store);
export const loadProject = (id: string) => get<Project>(`project:${id}`, store);

export async function listProjects(): Promise<Project[]> {
  const ks = (await keys(store)).filter((k) => String(k).startsWith('project:'));
  const all = await Promise.all(ks.map((k) => get<Project>(k, store)));
  return all.filter((p): p is Project => Boolean(p)).sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function deleteProject(p: Project) {
  await Promise.all([
    ...p.versions.map((v) => deleteBlob(v.id)),
    ...p.stickers.flatMap((s) => [deleteBlob(s.blobId), deleteBlob(s.origBlobId)]),
  ]);
  await del(`project:${p.id}`, store);
}

export async function createProject(name: string, blob: Blob, width: number, height: number) {
  const vid = uid();
  await putBlob(vid, blob);
  const now = Date.now();
  const p: Project = {
    id: uid(),
    name,
    createdAt: now,
    updatedAt: now,
    width,
    height,
    versions: [{ id: vid, label: 'Original photo', createdAt: now }],
    current: 0,
    stickers: [],
    items: [],
  };
  await saveProject(p);
  return p;
}
