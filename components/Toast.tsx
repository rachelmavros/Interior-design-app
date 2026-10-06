'use client';

import { IconX } from '@tabler/icons-react';
import { useStudio } from '@/lib/client/studio';

export function Toast() {
  const toast = useStudio((s) => s.toast);
  if (!toast) return null;
  return (
    <div className={`toast ${toast.kind}`} role={toast.kind === 'error' ? 'alert' : 'status'} key={toast.id}>
      <span>{toast.msg}</span>
      {toast.action && (
        <button
          className="btn btn-sm"
          onClick={() => {
            toast.action!.run();
            useStudio.setState({ toast: null });
          }}
        >
          {toast.action.label}
        </button>
      )}
      <button className="icon-btn" style={{ color: '#fff', width: 28, height: 28 }} onClick={() => useStudio.setState({ toast: null })} aria-label="Dismiss">
        <IconX size={15} />
      </button>
    </div>
  );
}
