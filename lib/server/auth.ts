/** Supabase settings; accounts and daily limits are off until these are set. */
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '');
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const accountsEnabled = () => Boolean(SUPABASE_URL && ANON_KEY);
export const limitsEnabled = () => Boolean(SUPABASE_URL && SERVICE_KEY);

export interface Account {
  id: string;
  email: string;
  admin: boolean;
}

export function isAdmin(email: string) {
  const admins = (process.env.ADMIN_EMAILS || '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
  return admins.includes(email.toLowerCase());
}

/** The signed-in person behind this request, checked with Supabase, or null. */
export async function currentAccount(req: Request): Promise<Account | null> {
  const token = req.headers.get('authorization')?.match(/^Bearer (.+)$/)?.[1];
  if (!token || !SUPABASE_URL || !ANON_KEY) return null;
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { apikey: ANON_KEY, Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const u = await res.json();
    if (!u?.id || !u?.email) return null;
    return { id: u.id, email: u.email, admin: isAdmin(u.email) };
  } catch (e) {
    console.warn('auth check failed', e);
    return null;
  }
}

/** Calls one of the usage functions with the server's private key. */
export async function rpc<T>(fn: string, args: Record<string, unknown>): Promise<T> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
    method: 'POST',
    headers: {
      apikey: SERVICE_KEY!,
      // Legacy service_role keys are JWTs and go here too; newer sb_secret_ keys only go in apikey.
      ...(SERVICE_KEY!.startsWith('eyJ') ? { Authorization: `Bearer ${SERVICE_KEY}` } : {}),
      'content-type': 'application/json',
    },
    body: JSON.stringify(args),
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`Usage service error (${res.status}): ${await res.text().catch(() => '')}`);
  return res.json();
}
