import { createStore, del, get, keys, set } from 'idb-keyval';
import type { Box, Product } from '../types';
import type { Quality } from '../models';

export interface Version {
  id: string;
  label: string;
  createdAt: number;
  /** Version this one was edited from. Missing on older projects, where it's the previous entry. */
  parentId?: string;
  /** Image model and quality that made this version, for AI edits. */
  ai?: { model: string; quality: Quality };
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
  /** An AI-designed piece lifted out of the photo (shop it via visual search). */
  generated?: boolean;
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

/** Lets cloud sync hear about local changes without this module depending on it. */
export const dbHooks: { saved?: (p: Project) => void; deleted?: (p: Project) => void } = {};

export async function saveProject(p: Project) {
  const next = { ...p, updatedAt: Date.now() };
  await set(`project:${p.id}`, next, store);
  dbHooks.saved?.(next);
}

/** Stores a project exactly as given (used when it arrives from the cloud). */
export const putProjectRaw = (p: Project) => set(`project:${p.id}`, p, store);
export const loadProject = (id: string) => get<Project>(`project:${id}`, store);

export async function listProjects(): Promise<Project[]> {
  const ks = (await keys(store)).filter((k) => String(k).startsWith('project:'));
  const all = await Promise.all(ks.map((k) => get<Project>(k, store)));
  return all.filter((p): p is Project => Boolean(p)).sort((a, b) => b.updatedAt - a.updatedAt);
}

/** Deletes a project and its photos; `localOnly` skips telling the cloud (used on sign-out). */
export async function deleteProject(p: Project, localOnly = false) {
  await Promise.all([
    ...p.versions.map((v) => deleteBlob(v.id)),
    ...p.stickers.flatMap((s) => [deleteBlob(s.blobId), deleteBlob(s.origBlobId)]),
  ]);
  await del(`project:${p.id}`, store);
  if (!localOnly) dbHooks.deleted?.(p);
}

/** Every photo a project needs. */
export const projectBlobIds = (p: Project) => [
  ...p.versions.map((v) => v.id),
  ...p.stickers.flatMap((s) => [s.blobId, s.origBlobId]),
];

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
