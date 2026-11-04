'use client';

import { useEffect, useRef, useState } from 'react';
import { IconBrandGoogleFilled, IconCloudCheck, IconCloudX, IconLoader2, IconLogout, IconUserCircle } from '@tabler/icons-react';
import { accountsOn, initAccount, signIn, useAccount } from '@/lib/client/account';
import { signOut, syncNow } from '@/lib/client/sync';

/** Sign in with Google, and the account menu once signed in. */
export function AccountButton() {
  const { ready, user, admin, edits, sync } = useAccount();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    initAccount();
  }, []);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  if (!accountsOn || !ready) return null;

  if (!user) {
    return (
      <button className="account-btn" onClick={() => signIn()} aria-label="Sign in with Google">
        <IconUserCircle size={20} />
        <span className="account-label">Sign in</span>
      </button>
    );
  }

  async function out() {
    setBusy(true);
    let ok = await signOut();
    if (!ok && confirm('Your latest changes couldn’t be saved to your account. Sign out anyway? Your rooms will stay on this device.')) {
      ok = await signOut(true);
    }
    setBusy(false);
    if (ok) setOpen(false);
  }

  return (
    <div className="account" ref={ref}>
      <button className="account-btn" onClick={() => setOpen((v) => !v)} aria-expanded={open} aria-label="Your account">
        {user.avatar ? <img src={user.avatar} alt="" referrerPolicy="no-referrer" /> : <IconUserCircle size={22} />}
      </button>
      {open && (
        <div className="account-menu" role="menu">
          <strong>{user.name || user.email}</strong>
          {user.name && <span className="tiny muted">{user.email}</span>}
          {admin && <span className="admin-tag">Admin</span>}
          <div className="account-row tiny">
            {sync === 'syncing' ? (
              <>
                <IconLoader2 size={15} className="spin" /> Saving to your account…
              </>
            ) : sync === 'error' ? (
              <>
                <IconCloudX size={15} /> Couldn’t sync.{' '}
                <button className="link-btn" onClick={() => syncNow()}>
                  Try again
                </button>
              </>
            ) : (
              <>
                <IconCloudCheck size={15} /> Rooms and saves are backed up
              </>
            )}
          </div>
          <div className="account-row tiny muted">
            {admin ? 'Unlimited AI edits' : edits ? `${Math.max(0, edits.limit - edits.used)} of ${edits.limit} AI edits left today` : ''}
          </div>
          <button className="btn btn-outline btn-sm btn-block" onClick={out} disabled={busy}>
            <IconLogout size={15} /> {busy ? 'Saving…' : 'Sign out'}
          </button>
        </div>
      )}
    </div>
  );
}

/** Small "edits left" line for the AI panel, with a sign-in nudge for signed-out visitors. */
export function EditsLeft() {
  const { user, admin, edits } = useAccount();
  if (admin || !edits) return null;
  const left = Math.max(0, edits.limit - edits.used);
  return (
    <p className="tiny muted" style={{ margin: '6px 2px 0' }}>
      {left} of {edits.limit} {user ? '' : 'free '}AI edits left today
      {!user && accountsOn && (
        <>
          {' · '}
          <button className="link-btn" onClick={() => signIn()}>
            <IconBrandGoogleFilled size={11} style={{ verticalAlign: -1 }} /> Sign in for more
          </button>
        </>
      )}
    </p>
  );
}
