'use client';

import { create } from 'zustand';
import { createStore, get as idbGet, set as idbSet } from 'idb-keyval';
import type { InspoPhoto, Product } from '../types';
import { uid } from './db';

export interface SavedItem {
  product: Product;
  folderId: string | null;
  savedAt: number;
}

export interface Folder {
  id: string;
  name: string;
}

interface Library {
  loaded: boolean;
  recent: Product[];
  saved: SavedItem[];
  folders: Folder[];
  /** Inspo photos hearted on the Inspo page, newest first. */
  inspo: InspoPhoto[];
  /** Last local change, for cloud sync. */
  updatedAt?: number;
}

export type LibraryData = Omit<Library, 'loaded'>;

/** Lets cloud sync hear about changes without this module depending on it. */
export const libraryHooks: { saved?: (data: LibraryData) => void } = {};

/** Shopping history and saved boards, shared by every room on this device. */
export const useLibrary = create<Library>(() => ({ loaded: false, recent: [], saved: [], folders: [], inspo: [] }));
const set = useLibrary.setState;
const get = useLibrary.getState;

const store = typeof indexedDB !== 'undefined' ? createStore('room-to-shop-library', 'data') : undefined;
const KEY = 'library';
const MAX_RECENT = 40;

let loading: Promise<void> | null = null;
export function loadLibrary() {
  loading ??= idbGet<Omit<Library, 'loaded'>>(KEY, store)
    .then((data) => set({ ...(data || {}), loaded: true }))
    .catch(() => set({ loaded: true }));
  return loading;
}

export function libraryData(): LibraryData {
  const { recent, saved, folders, inspo, updatedAt } = get();
  return { recent, saved, folders, inspo, updatedAt };
}

function save() {
  set({ updatedAt: Date.now() });
  const data = libraryData();
  idbSet(KEY, data, store).catch((e) => console.error('library save failed', e));
  libraryHooks.saved?.(data);
}

/** Replaces the library with data from the cloud (or empties it on sign-out), without echoing it back. */
export async function replaceLibrary(data: Partial<LibraryData>) {
  await loadLibrary();
  const next = { recent: [], saved: [], folders: [], inspo: [], ...data };
  set(next);
  await idbSet(KEY, libraryData(), store);
}

async function update(fn: (l: Library) => Partial<Library>) {
  await loadLibrary();
  set(fn(get()));
  save();
}

export function recordView(p: Product) {
  update((l) => ({ recent: [p, ...l.recent.filter((x) => x.link !== p.link)].slice(0, MAX_RECENT) }));
}

export function clearRecent() {
  update(() => ({ recent: [] }));
}

export function toggleSaved(p: Product) {
  update((l) =>
    l.saved.some((s) => s.product.link === p.link)
      ? { saved: l.saved.filter((s) => s.product.link !== p.link) }
      : { saved: [{ product: p, folderId: null, savedAt: Date.now() }, ...l.saved] },
  );
}

export function moveToFolder(link: string, folderId: string | null) {
  update((l) => ({ saved: l.saved.map((s) => (s.product.link === link ? { ...s, folderId } : s)) }));
}

export function createFolder(name: string) {
  const folder = { id: uid(), name: name.trim().slice(0, 40) || 'New folder' };
  update((l) => ({ folders: [...l.folders, folder] }));
  return folder.id;
}

export function deleteFolder(id: string) {
  update((l) => ({
    folders: l.folders.filter((f) => f.id !== id),
    saved: l.saved.map((s) => (s.folderId === id ? { ...s, folderId: null } : s)),
  }));
}

export function toggleInspo(photo: InspoPhoto) {
  update((l) =>
    l.inspo.some((x) => x.id === photo.id)
      ? { inspo: l.inspo.filter((x) => x.id !== photo.id) }
      : { inspo: [photo, ...l.inspo] },
  );
}
