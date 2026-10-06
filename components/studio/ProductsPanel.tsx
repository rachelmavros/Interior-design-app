'use client';

import { useEffect, useState } from 'react';
import { IconFolderPlus, IconTrash } from '@tabler/icons-react';
import { placeProduct } from '@/lib/client/studio';
import {
  clearRecent,
  createFolder,
  deleteFolder,
  loadLibrary,
  moveToFolder,
  useLibrary,
} from '@/lib/client/library';
import { ProductResults } from '../ProductResults';
import { ProductCard } from '../ProductCard';

const CATEGORIES = ['Sofa', 'Accent chair', 'Coffee table', 'Area rug', 'Floor lamp', 'Side table', 'Sideboard', 'Bookshelf', 'Bed frame', 'Dining chairs', 'Wall art', 'Plant'];

type View = 'search' | 'recent' | 'saved';

export function ProductsPanel() {
  const [view, setView] = useState<View>('search');
  const [preset, setPreset] = useState<string | undefined>();
  const recentCount = useLibrary((l) => l.recent.length);
  const savedCount = useLibrary((l) => l.saved.length);

  useEffect(() => {
    loadLibrary();
  }, []);

  return (
    <div className="stack">
      <div className="segmented" role="tablist" aria-label="Products view">
        <button className={view === 'search' ? 'on' : ''} onClick={() => setView('search')} role="tab" aria-selected={view === 'search'}>
          Search stores
        </button>
        <button className={view === 'recent' ? 'on' : ''} onClick={() => setView('recent')} role="tab" aria-selected={view === 'recent'}>
          Recent{recentCount ? ` (${recentCount})` : ''}
        </button>
        <button className={view === 'saved' ? 'on' : ''} onClick={() => setView('saved')} role="tab" aria-selected={view === 'saved'}>
          Saved{savedCount ? ` (${savedCount})` : ''}
        </button>
      </div>

      <div hidden={view !== 'search'}>
        <div className="stack">
          <p className="tiny muted">
            Search any store, hit “Try in room”, then drag it into place. “Blend with AI” matches your lighting and adds shadows.
            Tap ♡ to save a piece.
          </p>
          <div className="chips">
            {CATEGORIES.map((c) => (
              <button key={c} className={`chip ${preset === c.toLowerCase() ? 'on' : ''}`} onClick={() => setPreset(c.toLowerCase())}>
                {c}
              </button>
            ))}
          </div>
          <ProductResults mode="search" onPlace={placeProduct} presetQuery={preset} />
        </div>
      </div>
      {view === 'recent' && <RecentView />}
      {view === 'saved' && <SavedView />}
    </div>
  );
}

function RecentView() {
  const recent = useLibrary((l) => l.recent);
  if (!recent.length) {
    return <div className="empty small">Products you open or try in your room will show up here.</div>;
  }
  return (
    <div className="stack">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <span className="tiny muted">Most recent first</span>
        <button className="btn btn-ghost btn-sm" onClick={clearRecent}>
          Clear history
        </button>
      </div>
      <div className="grid">
        {recent.map((p) => (
          <ProductCard key={p.link} p={p} onPlace={placeProduct} />
        ))}
      </div>
    </div>
  );
}

function SavedView() {
  const saved = useLibrary((l) => l.saved);
  const folders = useLibrary((l) => l.folders);
  const [folder, setFolder] = useState<string>('all');
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState('');

  const shown = saved.filter((s) =>
    folder === 'all' ? true : folder === 'unsorted' ? !s.folderId : s.folderId === folder,
  );
  const current = folders.find((f) => f.id === folder);

  return (
    <div className="stack">
      <div className="folder-row">
        <button className={`chip ${folder === 'all' ? 'on' : ''}`} onClick={() => setFolder('all')}>
          All ({saved.length})
        </button>
        <button className={`chip ${folder === 'unsorted' ? 'on' : ''}`} onClick={() => setFolder('unsorted')}>
          Unsorted
        </button>
        {folders.map((f) => (
          <button key={f.id} className={`chip ${folder === f.id ? 'on' : ''}`} onClick={() => setFolder(f.id)}>
            {f.name} ({saved.filter((s) => s.folderId === f.id).length})
          </button>
        ))}
        {naming ? (
          <form
            className="row"
            onSubmit={(e) => {
              e.preventDefault();
              if (name.trim()) setFolder(createFolder(name));
              setName('');
              setNaming(false);
            }}
          >
            <input
              className="input"
              style={{ width: 150, padding: '5px 10px' }}
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Folder name"
              maxLength={40}
              aria-label="Folder name"
            />
            <button className="btn btn-primary btn-sm" type="submit">
              Add
            </button>
          </form>
        ) : (
          <button className="chip" onClick={() => setNaming(true)}>
            <IconFolderPlus size={14} style={{ verticalAlign: -2 }} /> New folder
          </button>
        )}
      </div>

      {current && (
        <div className="row" style={{ justifyContent: 'flex-end' }}>
          <button
            className="btn btn-ghost btn-sm btn-danger"
            onClick={() => {
              if (confirm(`Delete the folder “${current.name}”? Its items move to Unsorted.`)) {
                deleteFolder(current.id);
                setFolder('all');
              }
            }}
          >
            <IconTrash size={14} /> Delete folder
          </button>
        </div>
      )}

      {shown.length === 0 ? (
        <div className="empty small">
          {saved.length ? 'Nothing in this folder yet.' : 'Tap ♡ on any product to save it here.'}
        </div>
      ) : (
        <div className="grid">
          {shown.map((s) => (
            <ProductCard
              key={s.product.link}
              p={s.product}
              onPlace={placeProduct}
              footer={
                <select
                  className="select folder-select"
                  value={s.folderId ?? ''}
                  onChange={(e) => moveToFolder(s.product.link, e.target.value || null)}
                  aria-label="Folder"
                >
                  <option value="">Unsorted</option>
                  {folders.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))}
                </select>
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
