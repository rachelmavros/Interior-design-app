'use client';

import { useEffect, useState } from 'react';
import { stopEdit } from '@/lib/client/studio';

export function BusyOverlay({ label, startedAt, stoppable }: { label: string; startedAt: number; stoppable?: boolean }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const secs = Math.max(0, Math.round((now - startedAt) / 1000));
  const slow = !/cutting/i.test(label);

  return (
    <div className="busy-overlay">
      <div className="busy-card">
        <span className="spinner" />
        <div>
          <strong>{label}…</strong>
          <span className="tiny muted">
            {slow ? `${secs}s · AI edits usually take 20–60 seconds` : 'One moment'}
          </span>
        </div>
        {stoppable && (
          <button className="btn btn-sm" onClick={stopEdit}>
            Stop
          </button>
        )}
      </div>
    </div>
  );
}
