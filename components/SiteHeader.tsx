import Link from 'next/link';
import { IconArmchair2 } from '@tabler/icons-react';
import { AccountButton } from './AccountButton';

export function SiteHeader({ children }: { children?: React.ReactNode }) {
  return (
    <header className="site-header">
      <Link href="/" className="logo">
        <span className="logo-mark">
          <IconArmchair2 size={17} stroke={2} />
        </span>
        <span className="word">Room to Shop</span>
      </Link>
      {children}
      <nav className="nav">
        <Link href="/#rooms">My rooms</Link>
        <Link href="/inspo">Inspo</Link>
        <Link href="/shop">Shop a photo</Link>
      </nav>
      <AccountButton />
    </header>
  );
}
