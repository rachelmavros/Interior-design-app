'use client';

import { create } from 'zustand';
import { createClient, type Session, type SupabaseClient } from '@supabase/supabase-js';

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** Null until NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set. */
export const supabase: SupabaseClient | null =
  URL && ANON && typeof window !== 'undefined'
    ? createClient(URL, ANON, { auth: { flowType: 'pkce', persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } })
    : null;

export const accountsOn = Boolean(URL && ANON);

export interface AccountState {
  ready: boolean;
  user: { id: string; email: string; name?: string; avatar?: string } | null;
  admin: boolean;
  /** Today's AI edits; null when there's no limit (admin, or limits not set up). */
  edits: { used: number; limit: number; signedIn: boolean } | null;
  sync: 'idle' | 'syncing' | 'error';
}

export const useAccount = create<AccountState>(() => ({ ready: false, user: null, admin: false, edits: null, sync: 'idle' }));

const DEVICE_KEY = 'rts-device-id';
let memoryDevice = '';

/** A random id for this browser, used to count free edits for signed-out visitors. */
export function deviceId() {
  try {
    let id = localStorage.getItem(DEVICE_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(DEVICE_KEY, id);
    }
    return id;
  } catch {
    memoryDevice ||= crypto.randomUUID();
    return memoryDevice;
  }
}

let session: Session | null = null;

export async function accessToken() {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  session = data.session;
  return session?.access_token ?? null;
}

/** Headers that tell the server who's asking. */
export async function identityHeaders(): Promise<Record<string, string>> {
  const h: Record<string, string> = { 'x-device-id': deviceId() };
  const token = await accessToken();
  if (token) h.authorization = `Bearer ${token}`;
  return h;
}

/** Re-reads admin status and today's edit count from the server. */
export async function refreshAccount() {
  try {
    const res = await fetch('/api/me', { headers: await identityHeaders() });
    const me = await res.json();
    useAccount.setState({ admin: Boolean(me.admin), edits: me.edits ?? null });
  } catch {}
}

type Listener = (userId: string | null) => void;
const listeners: Listener[] = [];
/** Lets cloud sync start and stop with sign-in without this module importing it. */
export function onAccountChange(fn: Listener) {
  listeners.push(fn);
}

let started = false;
export function initAccount() {
  if (started) return;
  started = true;
  if (!supabase) {
    useAccount.setState({ ready: true });
    refreshAccount();
    return;
  }
  let current: string | null | undefined;
  const apply = (s: Session | null) => {
    session = s;
    const u = s?.user;
    useAccount.setState({
      ready: true,
      user: u
        ? {
            id: u.id,
            email: u.email ?? '',
            name: (u.user_metadata?.full_name as string) || (u.user_metadata?.name as string) || undefined,
            avatar: (u.user_metadata?.avatar_url as string) || (u.user_metadata?.picture as string) || undefined,
          }
        : null,
    });
    const id = u?.id ?? null;
    if (id !== current) {
      current = id;
      refreshAccount();
      for (const fn of listeners) fn(id);
    }
  };
  supabase.auth.getSession().then(({ data }) => apply(data.session));
  supabase.auth.onAuthStateChange((_event, s) => apply(s));
}

export async function signIn() {
  if (!supabase) return;
  await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.href.split('#')[0] },
  });
}

export async function signOutNow() {
  await supabase?.auth.signOut();
}
