'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { IconChevronLeft, IconChevronRight, IconExternalLink, IconHeart, IconHeartFilled, IconShoppingBag, IconX } from '@tabler/icons-react';
import { SiteHeader } from '@/components/SiteHeader';
import { SetupNotice } from '@/components/SetupNotice';
import { Disclosure } from '@/components/Disclosure';
import { inspoSearch, magazines as loadMagazines, reportInspoUse } from '@/lib/client/api';
import { loadLibrary, toggleInspo, useLibrary } from '@/lib/client/library';
import { STYLES } from '@/lib/prompts';
import type { InspoPhoto, Magazine } from '@/lib/types';

const ROOMS = ['Living room', 'Bedroom', 'Kitchen', 'Dining room', 'Bathroom', 'Home office', 'Entryway', 'Nursery', 'Patio'];

type View = InspoPhoto['provider'] | 'saved';

const SOURCES: { id: InspoPhoto['provider']; label: string }[] = [
  { id: 'pinterest', label: 'Pinterest' },
  { id: 'unsplash', label: 'Unsplash' },
];

function query(room: string, style: string) {
  if (!room && !style) return 'interior design';
  return `${style} ${room || 'interior'} interior design`.trim().toLowerCase();
}

function Chips({ options, value, onChange, any }: { options: string[]; value: string; onChange: (v: string) => void; any: string }) {
  return (
    <div className="chip-row">
      {['', ...options].map((o) => (
        <button key={o || 'any'} className={`chip ${value === o ? 'on' : ''}`} onClick={() => onChange(o)}>
          {o || any}
        </button>
      ))}
    </div>
  );
}

/** Full-screen view of one photo, with arrows (and arrow keys) to step through the rest. */
function Lightbox({
  photos,
  index,
  onIndex,
  onClose,
  onShop,
  savedIds,
}: {
  photos: InspoPhoto[];
  index: number;
  onIndex: (i: number) => void;
  onClose: () => void;
  onShop: (p: InspoPhoto) => void;
  savedIds: Set<string>;
}) {
  const p = photos[index];
  const [big, setBig] = useState(false);
  const [touchX, setTouchX] = useState<number | null>(null);
  const step = (d: number) => onIndex((index + d + photos.length) % photos.length);

  useEffect(() => setBig(false), [p?.id]);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') step(-1);
      if (e.key === 'ArrowRight') step(1);
    };
    window.addEventListener('keydown', key);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', key);
      document.body.style.overflow = '';
    };
  });
  if (!p) return null;
  const isSaved = savedIds.has(p.id);

  return (
    <div className="lightbox" role="dialog" aria-modal="true" aria-label={p.alt} onClick={onClose}>
      <button className="lightbox-close" aria-label="Close" onClick={onClose}>
        <IconX size={22} />
      </button>
      <div
        className="lightbox-stage"
        onClick={(e) => e.stopPropagation()}
        onTouchStart={(e) => setTouchX(e.touches[0].clientX)}
        onTouchEnd={(e) => {
          if (touchX === null) return;
          const dx = e.changedTouches[0].clientX - touchX;
          if (Math.abs(dx) > 50) step(dx < 0 ? 1 : -1);
          setTouchX(null);
        }}
      >
        {/* The grid-size image shows at once; the full-size one swaps in when it has loaded. */}
        <img src={big ? p.full : p.src} alt={p.alt} />
        {!big && p.full !== p.src && <img src={p.full} alt="" hidden onLoad={() => setBig(true)} />}
        {photos.length > 1 && (
          <>
            <button className="lightbox-nav prev" aria-label="Previous photo" onClick={() => step(-1)}>
              <IconChevronLeft size={22} />
            </button>
            <button className="lightbox-nav next" aria-label="Next photo" onClick={() => step(1)}>
              <IconChevronRight size={22} />
            </button>
          </>
        )}
      </div>
      <div className="lightbox-bar" onClick={(e) => e.stopPropagation()}>
        <button className="btn btn-accent btn-sm" onClick={() => onShop(p)}>
          <IconShoppingBag size={15} /> Shop this look
        </button>
        <button className={`btn btn-sm btn-outline lightbox-heart ${isSaved ? 'on' : ''}`} onClick={() => toggleInspo(p)} aria-pressed={isSaved}>
          {isSaved ? <IconHeartFilled size={15} /> : <IconHeart size={15} />} {isSaved ? 'Saved' : 'Save'}
        </button>
        <a className="btn btn-sm btn-ghost" href={p.sourceUrl} target="_blank" rel="noopener noreferrer">
          <IconExternalLink size={15} /> {p.provider === 'unsplash' ? 'Unsplash' : 'Source'}
        </a>
      </div>
    </div>
  );
}

export default function InspoPage() {
  const router = useRouter();
  const [room, setRoom] = useState('Living room');
  const [style, setStyle] = useState('');
  const [photos, setPhotos] = useState<InspoPhoto[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  const [mags, setMags] = useState<Magazine[]>([]);
  const [source, setSource] = useState<InspoPhoto['provider']>('pinterest');
  const [view, setView] = useState<View>('pinterest');
  const saved = useLibrary((l) => l.inspo);
  const savedIds = new Set(saved.map((p) => p.id));

  useEffect(() => {
    loadMagazines().then(setMags);
    loadLibrary();
  }, []);

  const q = query(room, style);
  useEffect(() => {
    let live = true;
    setLoading(true);
    setError(undefined);
    setPhotos([]);
    inspoSearch(q, source, 0)
      .then((d) => {
        if (!live) return;
        setPhotos(d.photos);
        setHasMore(d.hasMore);
      })
      .catch((e) => live && setError((e as Error).message))
      .finally(() => live && setLoading(false));
    return () => {
      live = false;
    };
  }, [q, source]);

  async function loadMore() {
    const next = page + 1;
    setLoading(true);
    try {
      const d = await inspoSearch(q, source, next);
      setPhotos((list) => [...list, ...d.photos.filter((p) => !list.some((x) => x.id === p.id))]);
      setHasMore(d.hasMore);
      setPage(next);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  function pick(next: { room?: string; style?: string; source?: InspoPhoto['provider'] }) {
    setPage(0);
    if (next.room !== undefined) setRoom(next.room);
    if (next.style !== undefined) setStyle(next.style);
    if (next.source) setSource(next.source);
  }

  const showSaved = view === 'saved';
  const shown = showSaved ? saved : photos;
  const [open, setOpen] = useState<number | null>(null);

  function shop(p: InspoPhoto) {
    reportInspoUse(p.useUrl);
    router.push(`/shop?photo=${encodeURIComponent(p.full)}`);
  }

  return (
    <>
      <SiteHeader />
      <main className="page">
        <SetupNotice />
        <div style={{ margin: '32px 0 20px' }}>
          <h1 className="display" style={{ fontSize: 40, lineHeight: 1.1, marginBottom: 8 }}>
            Inspo
          </h1>
          <p className="muted">Find a room you love, then shop the look piece by piece.</p>
        </div>

        {mags.map((m) => (
          <section key={m.name} style={{ marginBottom: 28 }}>
            <div className="section-head">
              <h2 className="display" style={{ fontSize: 22 }}>From {m.name}</h2>
              <a className="tiny muted" href={m.home} target="_blank" rel="noopener noreferrer">
                Visit site <IconExternalLink size={11} />
              </a>
            </div>
            <div className="story-row">
              {m.stories.map((s) => (
                <a key={s.link} className="story" href={s.link} target="_blank" rel="noopener noreferrer">
                  {s.image ? <img src={s.image} alt="" loading="lazy" /> : <div className="story-img" />}
                  <strong>{s.title}</strong>
                  <span className="tiny muted">
                    {s.date && !Number.isNaN(Date.parse(s.date)) ? new Date(s.date).toLocaleDateString() : m.name} <IconExternalLink size={11} />
                  </span>
                </a>
              ))}
            </div>
          </section>
        ))}

        <section>
          <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, gap: 12 }}>
            <h2 className="display" style={{ fontSize: 22, whiteSpace: 'nowrap' }}>Rooms to shop</h2>
            <div className="segmented" style={{ width: 'auto' }}>
              {SOURCES.map((s) => (
                <button
                  key={s.id}
                  className={view === s.id ? 'on' : ''}
                  onClick={() => {
                    setView(s.id);
                    pick({ source: s.id });
                  }}
                >
                  {s.label}
                </button>
              ))}
              <button className={showSaved ? 'on' : ''} onClick={() => setView('saved')} aria-label={`Saved (${saved.length})`}>
                <span className="saved-count">
                  <IconHeartFilled size={13} /> {saved.length}
                </span>
              </button>
            </div>
          </div>
          {!showSaved && (
            <>
              <Chips options={ROOMS} value={room} onChange={(v) => pick({ room: v })} any="Any room" />
              <Chips options={STYLES} value={style} onChange={(v) => pick({ style: v })} any="Any style" />
            </>
          )}
          {!showSaved && error && <p className="small" style={{ color: 'var(--error)', marginTop: 12 }}>{error}</p>}
          {showSaved && saved.length === 0 && (
            <div className="empty" style={{ marginTop: 12 }}>
              Nothing saved yet. Tap the heart on any photo to keep it here.
            </div>
          )}
          <div className="inspo-grid">
            {shown.map((p, i) => (
              <figure key={p.id} className="inspo-card">
                <img
                  src={p.src}
                  alt={p.alt}
                  loading="lazy"
                  onClick={() => setOpen(i)}
                  style={{ aspectRatio: `${p.width} / ${p.height}`, background: p.color }}
                  onError={(e) => {
                    // Some pins can't be shown outside Pinterest; drop them rather than leave a blank tile.
                    (e.currentTarget.closest('.inspo-card') as HTMLElement | null)?.style.setProperty('display', 'none');
                  }}
                />
                <button className="btn btn-sm inspo-shop" onClick={() => shop(p)}>
                  <IconShoppingBag size={14} /> Shop this look
                </button>
                <figcaption className="tiny muted">
                  <span>
                  {p.provider === 'unsplash' ? (
                    <>
                      Photo by{' '}
                      <a href={p.authorUrl} target="_blank" rel="noopener noreferrer">
                        {p.author}
                      </a>{' '}
                      on{' '}
                      <a href={p.sourceUrl} target="_blank" rel="noopener noreferrer">
                        Unsplash
                      </a>
                    </>
                  ) : (
                    <>
                      via{' '}
                      <a href={p.sourceUrl} target="_blank" rel="noopener noreferrer">
                        {p.author}
                      </a>
                    </>
                  )}
                  </span>
                  <button
                    className={`inspo-heart ${savedIds.has(p.id) ? 'on' : ''}`}
                    onClick={() => toggleInspo(p)}
                    aria-label={savedIds.has(p.id) ? 'Remove from saved' : 'Save'}
                    aria-pressed={savedIds.has(p.id)}
                  >
                    {savedIds.has(p.id) ? <IconHeartFilled size={17} /> : <IconHeart size={17} />}
                  </button>
                </figcaption>
              </figure>
            ))}
          </div>
          {!showSaved && loading && <span className="spinner" style={{ display: 'block', margin: '20px auto' }} />}
          {!showSaved && !loading && !error && photos.length === 0 && <div className="empty">No photos for that combination. Try another style.</div>}
          {!showSaved && !loading && hasMore && (
            <div style={{ textAlign: 'center', marginTop: 16 }}>
              <button className="btn btn-outline" onClick={loadMore}>
                Load more
              </button>
            </div>
          )}
        </section>
        {open !== null && (
          <Lightbox
            photos={shown}
            index={Math.min(open, shown.length - 1)}
            onIndex={setOpen}
            onClose={() => setOpen(null)}
            onShop={shop}
            savedIds={savedIds}
          />
        )}
        <Disclosure />
      </main>
    </>
  );
}
