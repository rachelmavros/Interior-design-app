import { accountsEnabled, currentAccount } from '@/lib/server/auth';
import { editsToday } from '@/lib/server/quota';

export const dynamic = 'force-dynamic';

/** Who's signed in (checked server-side), whether they're an admin, and today's AI edit count. */
export async function GET(req: Request) {
  const account = await currentAccount(req);
  return Response.json({
    accounts: accountsEnabled(),
    email: account?.email ?? null,
    admin: account?.admin ?? false,
    edits: await editsToday(req, account),
  });
}
