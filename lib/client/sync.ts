'use client';

import { onAccountChange, signOutNow, supabase, useAccount } from './account';
import { dbHooks, deleteProject, getBlob, listProjects, loadProject, projectBlobIds, putBlob, putProjectRaw, type Project } from './db';
import { libraryHooks, libraryData, loadLibrary, replaceLibrary, type LibraryData } from './library';

/**
 * Cloud sync for signed-in people. The browser's own storage stays the
 * working copy; rooms, photos and the library are mirrored to Supabase and
 * pulled onto other devices. Newer wins, compared by each item's updatedAt.
 */

const BUCKET = 'blobs';
const OWNER_KEY = 'rts-sync-owner';
export const SYNC_EVENT = 'rts-synced';

let uid: string | null = null;
let running: Promise<void> | null = null;
let again = false;
/** Photo ids already in the cloud for this account. */
let uploaded: Set<string> | null = null;
const timers = new Map<string, ReturnType<typeof setTimeout>>();
let chain: Promise<unknown> = Promise.resolve();

function owner() {
  try {
    return localStorage.getItem(OWNER_KEY);
  } catch {
    return null;
  }
}
function setOwner(id: string | null) {
  try {
    if (id) localStorage.setItem(OWNER_KEY, id);
    else localStorage.removeItem(OWNER_KEY);
  } catch {}
}
/** Data on this device was last synced to a different account; don't upload it to this one. */
const foreign = (id: string) => {
  const o = owner();
  return Boolean(o && o !== id);
};

async function remoteBlobs(id: string) {
  const names = new Set<string>();
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await supabase!.storage.from(BUCKET).list(id, { limit: 1000, offset });
    if (error) throw error;
    for (const f of data) names.add(f.name);
    if (data.length < 1000) return names;
  }
}

async function pushProject(id: string, p: Project) {
  uploaded ??= await remoteBlobs(id);
  for (const blobId of projectBlobIds(p)) {
    if (uploaded.has(blobId)) continue;
    const blob = await getBlob(blobId);
    if (!blob) continue;
    const { error } = await supabase!.storage
      .from(BUCKET)
      .upload(`${id}/${blobId}`, blob, { upsert: true, contentType: blob.type || 'image/jpeg' });
    if (error) throw error;
    uploaded.add(blobId);
  }
  const { error } = await supabase!
    .from('projects')
    .upsert({ user_id: id, id: p.id, data: p, updated_at: new Date(p.updatedAt).toISOString(), deleted: false });
  if (error) throw error;
}

async function pullProject(id: string, projectId: string) {
  const { data, error } = await supabase!.from('projects').select('data').eq('id', projectId).single();
  if (error) throw error;
  const p = data.data as Project;
  for (const blobId of projectBlobIds(p)) {
    if (await getBlob(blobId)) continue;
    const { data: file, error: e } = await supabase!.storage.from(BUCKET).download(`${id}/${blobId}`);
    if (e || !file) {
      console.warn('sync: missing photo', blobId, e);
      continue;
    }
    await putBlob(blobId, file);
  }
  await putProjectRaw(p);
}

async function syncProjects(id: string) {
  const { data: remote, error } = await supabase!.from('projects').select('id, updated_at, deleted');
  if (error) throw error;
  const byId = new Map(remote.map((r) => [r.id as string, r]));
  const local = await listProjects();
  const localById = new Map(local.map((p) => [p.id, p]));
  const mine = !foreign(id);

  for (const p of local) {
    const r = byId.get(p.id);
    if (r?.deleted) {
      await deleteProject(p, true);
      continue;
    }
    if (mine && (!r || p.updatedAt > Date.parse(r.updated_at) + 500)) await pushProject(id, p);
  }
  for (const r of remote) {
    if (r.deleted) continue;
    const l = localById.get(r.id);
    if (!l || Date.parse(r.updated_at) > l.updatedAt + 500) await pullProject(id, r.id);
  }
}

function merge(local: LibraryData, remote: LibraryData): LibraryData {
  const by = <T>(items: T[], key: (x: T) => string) => {
    const seen = new Set<string>();
    return items.filter((x) => !seen.has(key(x)) && (seen.add(key(x)), true));
  };
  return {
    recent: by([...(local.recent || []), ...(remote.recent || [])], (p) => p.link).slice(0, 40),
    saved: by([...(local.saved || []), ...(remote.saved || [])], (s) => s.product.link),
    folders: by([...(local.folders || []), ...(remote.folders || [])], (f) => f.id),
    inspo: by([...(local.inspo || []), ...(remote.inspo || [])], (p) => p.id),
    updatedAt: Date.now(),
  };
}

async function pushLibrary(id: string, data: LibraryData) {
  const { error } = await supabase!
    .from('libraries')
    .upsert({ user_id: id, data, updated_at: new Date(data.updatedAt || Date.now()).toISOString() });
  if (error) throw error;
}

async function syncLibrary(id: string) {
  await loadLibrary();
  const local = libraryData();
  const { data, error } = await supabase!.from('libraries').select('data').maybeSingle();
  if (error) throw error;
  const mine = !foreign(id);
  if (!data) {
    if (mine) await pushLibrary(id, { ...local, updatedAt: local.updatedAt || Date.now() });
    return;
  }
  const remote = data.data as LibraryData;
  if (!mine) return replaceLibrary(remote);
  if (owner() !== id) {
    // First sync of this device with this account: keep both sides' saves.
    const merged = merge(local, remote);
    await replaceLibrary(merged);
    return pushLibrary(id, merged);
  }
  if ((remote.updatedAt || 0) > (local.updatedAt || 0)) await replaceLibrary(remote);
  else if ((local.updatedAt || 0) > (remote.updatedAt || 0)) await pushLibrary(id, local);
}

/** Runs a full two-way sync; overlapping calls share one run (plus one follow-up). */
export function syncNow(): Promise<void> {
  if (!supabase || !uid) return Promise.resolve();
  if (running) {
    again = true;
    return running;
  }
  running = (async () => {
    useAccount.setState({ sync: 'syncing' });
    try {
      do {
        again = false;
        const id = uid;
        if (!id) break;
        await chain;
        await syncProjects(id);
        await syncLibrary(id);
        setOwner(id);
      } while (again && uid);
      useAccount.setState({ sync: 'idle' });
    } catch (e) {
      console.error('sync failed', e);
      useAccount.setState({ sync: 'error' });
    } finally {
      window.dispatchEvent(new Event(SYNC_EVENT));
    }
  })().finally(() => {
    running = null;
  });
  return running;
}

/** Pushes one change a few seconds after the last edit, so a burst of edits is one upload. */
function later(key: string, fn: (id: string) => Promise<void>) {
  if (!uid || foreign(uid)) return;
  clearTimeout(timers.get(key));
  timers.set(
    key,
    setTimeout(() => {
      timers.delete(key);
      const id = uid;
      if (!id) return;
      chain = chain
        .then(() => fn(id))
        .catch((e) => {
          console.error('sync push failed', e);
          useAccount.setState({ sync: 'error' });
        });
    }, 3000),
  );
}

dbHooks.saved = (p) =>
  later(`p:${p.id}`, async (id) => {
    const latest = await loadProject(p.id);
    if (latest) await pushProject(id, latest);
  });

dbHooks.deleted = (p) => {
  const id = uid;
  if (!id || foreign(id)) return;
  clearTimeout(timers.get(`p:${p.id}`));
  chain = chain.then(async () => {
    const { error } = await supabase!
      .from('projects')
      .upsert({ user_id: id, id: p.id, data: {}, deleted: true, updated_at: new Date().toISOString() });
    if (error) console.error('sync delete failed', error);
    const ids = projectBlobIds(p);
    await supabase!.storage.from(BUCKET).remove(ids.map((b) => `${id}/${b}`));
    for (const b of ids) uploaded?.delete(b);
  });
};

libraryHooks.saved = () => later('library', (id) => pushLibrary(id, libraryData()));

onAccountChange((id) => {
  uid = id;
  uploaded = null;
  if (id) syncNow();
});

/**
 * Saves everything to the account, signs out, and clears this device so the
 * next person on it doesn't see these rooms. Returns false, without signing
 * out, if the final save failed.
 */
export async function signOut(force = false): Promise<boolean> {
  for (const t of timers.values()) clearTimeout(t);
  timers.clear();
  if (!force) {
    await syncNow();
    if (useAccount.getState().sync === 'error') return false;
  }
  await signOutNow();
  if (!force) {
    for (const p of await listProjects()) await deleteProject(p, true);
    await replaceLibrary({});
    setOwner(null);
  }
  window.dispatchEvent(new Event(SYNC_EVENT));
  return true;
}
