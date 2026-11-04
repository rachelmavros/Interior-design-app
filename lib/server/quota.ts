import { limitsEnabled, rpc, type Account } from './auth';

const num = (v: string | undefined, d: number) => (Number.isFinite(Number(v)) && Number(v) > 0 ? Math.floor(Number(v)) : d);

/** Daily AI edits. Signed-out visitors are counted per device and, as a backstop, per network. */
export const LIMITS = {
  free: () => num(process.env.FREE_EDITS_PER_DAY, 3),
  account: () => num(process.env.ACCOUNT_EDITS_PER_DAY, 15),
  network: () => num(process.env.NETWORK_EDITS_PER_DAY, 10),
};

interface Plan {
  keys: string[];
  limits: number[];
  signedIn: boolean;
}

function plan(req: Request, account: Account | null): Plan | null {
  if (account?.admin) return null;
  if (account) return { keys: [`user:${account.id}`], limits: [LIMITS.account()], signedIn: true };
  const device = req.headers.get('x-device-id') || '';
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'local';
  const keys = /^[a-z0-9-]{16,64}$/i.test(device) ? [`device:${device}`, `ip:${ip}`] : [`ip:${ip}`];
  const limits = keys.length === 2 ? [LIMITS.free(), LIMITS.network()] : [LIMITS.free()];
  return { keys, limits, signedIn: false };
}

export type Charge = { ok: true; refund: () => Promise<void> } | { ok: false; message: string };

/** Counts one AI edit, or says why it can't run. Admins and setups without Supabase are unlimited. */
export async function chargeEdit(req: Request, account: Account | null): Promise<Charge> {
  const p = limitsEnabled() ? plan(req, account) : null;
  if (!p) return { ok: true, refund: async () => {} };
  try {
    const left = await rpc<number>('bump_usage', { p_keys: p.keys, p_limits: p.limits });
    if (left < 0) {
      return {
        ok: false,
        message: p.signedIn
          ? `You’ve used today’s ${LIMITS.account()} AI edits. They reset at midnight UTC.`
          : `You’ve used today’s ${LIMITS.free()} free AI edits. Sign in with Google for ${LIMITS.account()} a day.`,
      };
    }
  } catch (e) {
    // If the counter is down, don't block people; log it so it gets noticed.
    console.error('usage charge failed', e);
    return { ok: true, refund: async () => {} };
  }
  return {
    ok: true,
    refund: () => rpc<void>('refund_usage', { p_keys: p.keys }).catch((e) => console.error('usage refund failed', e)),
  };
}

/** Edits used today and the daily limit, for showing in the app; null when unlimited. */
export async function editsToday(req: Request, account: Account | null) {
  const p = limitsEnabled() ? plan(req, account) : null;
  if (!p) return null;
  try {
    const used = await rpc<number>('usage_today', { p_key: p.keys[0] });
    return { used, limit: p.limits[0], signedIn: p.signedIn };
  } catch (e) {
    console.error('usage read failed', e);
    return null;
  }
}
