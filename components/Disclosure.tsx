'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getConfig } from '@/lib/client/api';

export function Disclosure() {
  const [amazon, setAmazon] = useState(false);
  useEffect(() => {
    getConfig().then((c) => setAmazon(c.amazon));
  }, []);

  return (
    <footer className="disclosure">
      Room to Shop may earn a commission when you buy through links on this site, at no extra cost to you.
      {amazon && ' As an Amazon Associate we earn from qualifying purchases.'} Prices and availability come from retailers and
      can change. AI visualizations are previews, not exact representations of products. Your room photos and projects are
      stored only in this browser. <Link href="/privacy">Privacy policy</Link>
    </footer>
  );
}
