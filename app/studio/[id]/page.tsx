'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { IconPalette, IconShoppingBag, IconSofa } from '@tabler/icons-react';
import { SiteHeader } from '@/components/SiteHeader';
import { SetupNotice } from '@/components/SetupNotice';
import { Toast } from '@/components/Toast';
import { Stage } from '@/components/studio/Stage';
import { Toolbar } from '@/components/studio/Toolbar';
import { VersionStrip } from '@/components/studio/VersionStrip';
import { DesignPanel } from '@/components/studio/DesignPanel';
import { ProductsPanel } from '@/components/studio/ProductsPanel';
import { ShopPanel } from '@/components/studio/ShopPanel';
import { SelectedSticker } from '@/components/studio/SelectedSticker';
import {
  flushSave,
  loadStudio,
  redo,
  removeSticker,
  renameProject,
  undo,
  undoMask,
  unloadStudio,
  useStudio,
  visibleItems,
  type Tab,
} from '@/lib/client/studio';

const TABS: { id: Tab; label: string; Icon: typeof IconPalette }[] = [
  { id: 'design', label: 'Design', Icon: IconPalette },
  { id: 'products', label: 'Products', Icon: IconSofa },
  { id: 'shop', label: 'Shop', Icon: IconShoppingBag },
];

export default function StudioPage() {
  const { id } = useParams<{ id: string }>();
  const project = useStudio((s) => s.project);
  const base = useStudio((s) => s.base);
  const loadError = useStudio((s) => s.loadError);
  const tab = useStudio((s) => s.tab);

  useEffect(() => {
    loadStudio(id);
    return unloadStudio;
  }, [id]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const t = e.target as HTMLElement;
      if (t.closest('input, textarea, select, [contenteditable]')) return;
      const { selected, tool } = useStudio.getState();
      if ((e.key === 'Delete' || e.key === 'Backspace') && selected) {
        e.preventDefault();
        removeSticker(selected);
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) redo();
        else if (['brush', 'eraser', 'rect', 'lasso'].includes(tool) && useStudio.getState().maskHistory.length) undoMask();
        else undo();
      } else if (e.key === 'Escape') {
        useStudio.setState({ selected: null, compare: false });
      }
    }
    window.addEventListener('keydown', onKey);
    window.addEventListener('pagehide', flushSave);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('pagehide', flushSave);
    };
  }, []);

  if (loadError) {
    return (
      <>
        <SiteHeader />
        <div className="page" style={{ paddingTop: 48 }}>
          <div className="empty">
            <p>{loadError}</p>
            <p className="small" style={{ marginTop: 8 }}>
              Projects are saved in this browser only. <Link href="/">Back to your rooms</Link>
            </p>
          </div>
        </div>
      </>
    );
  }

  if (!project || !base) {
    return (
      <>
        <SiteHeader />
        <div className="page" style={{ paddingTop: 80, display: 'grid', placeItems: 'center' }}>
          <span className="spinner" />
        </div>
      </>
    );
  }

  const shopCount = visibleItems(project).length + project.stickers.filter((s) => s.product).length;

  return (
    <>
      <SiteHeader>
        <input
          className="studio-title"
          defaultValue={project.name}
          aria-label="Project name"
          onBlur={(e) => renameProject(e.target.value.trim())}
          onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
        />
      </SiteHeader>
      <div className="studio">
        <section className="studio-main">
          <Toolbar />
          <Stage />
          <VersionStrip />
        </section>
        <aside className="studio-side">
          <div className="tabs" role="tablist">
            {TABS.map(({ id: t, label, Icon }) => (
              <button
                key={t}
                className={`tab ${tab === t ? 'on' : ''}`}
                onClick={() => useStudio.setState({ tab: t })}
                role="tab"
                aria-selected={tab === t}
              >
                <Icon size={17} /> {label}
                {t === 'shop' && shopCount > 0 && <span className="count">{shopCount}</span>}
              </button>
            ))}
          </div>
          <div className="panel">
            <SetupNotice />
            <SelectedSticker />
            <div hidden={tab !== 'design'}>
              <DesignPanel />
            </div>
            <div hidden={tab !== 'products'}>
              <ProductsPanel />
            </div>
            <div hidden={tab !== 'shop'}>
              <ShopPanel />
            </div>
          </div>
        </aside>
      </div>
      <Toast />
    </>
  );
}
