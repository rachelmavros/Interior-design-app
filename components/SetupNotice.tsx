'use client';

import { useEffect, useState } from 'react';
import { IconAlertTriangle } from '@tabler/icons-react';
import { getConfig } from '@/lib/client/api';
import type { AppConfig } from '@/lib/types';

/** Tells the site owner which keys are missing instead of failing mysteriously. */
export function SetupNotice() {
  const [config, setConfig] = useState<AppConfig | null>(null);
  useEffect(() => {
    getConfig().then(setConfig);
  }, []);
  if (!config) return null;
  if (config.mock) {
    return (
      <div className="banner banner-warn">
        <IconAlertTriangle size={16} />
        <span>Demo mode: search results and AI edits are simulated (MOCK_APIS is on).</span>
      </div>
    );
  }
  if (!config.missing.length) return null;
  return (
    <div className="banner banner-warn">
      <IconAlertTriangle size={16} />
      <span>
        Setup needed: add {config.missing.join(', ')} in your Vercel project’s Environment Variables, then redeploy.
      </span>
    </div>
  );
}
