'use client';

import { useState } from 'react';
import { useAccessGate } from '@/lib/client/api';

export function AccessGate() {
  const { open, resolve, wrong } = useAccessGate();
  const [code, setCode] = useState('');
  if (!open || !resolve) return null;

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="gate-title">
      <form
        className="modal"
        onSubmit={(e) => {
          e.preventDefault();
          resolve(code.trim() || null);
          setCode('');
        }}
      >
        <h2 id="gate-title">Enter access code</h2>
        <p className="muted">
          {wrong ? 'That code didn’t work — try again.' : 'This preview is invite-only. Enter the code you were given.'}
        </p>
        <input
          className="input"
          autoFocus
          type="password"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Access code"
        />
        <div className="row-end">
          <button type="button" className="btn btn-ghost" onClick={() => resolve(null)}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary">
            Continue
          </button>
        </div>
      </form>
    </div>
  );
}
