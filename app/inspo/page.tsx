'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { IconExternalLink, IconShoppingBag } from '@tabler/icons-react';
import { SiteHeader } from '@/components/SiteHeader';
import { SetupNotice } from '@/components/SetupNotice';
import { Disclosure } from '@/components/Disclosure';
import { editorialStories, inspoSearch, reportInspoUse } from '@/lib/client/api';
import { STYLES } from '@/lib/prompts';
import type { InspoPhoto, Story } from '@/lib/types';

const ROOMS = ['Living room', 'Bedroom', 'Kitchen', 'Dining room', 'Bathroom', 'Home office', 'Entryway', 'Nursery', 'Patio'];

function query(room: string, style: string) {
  if (!room && !style) return 'interior design';
  return `${style} ${room || 'interior'}`.trim().toLowerCase();
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

export default function InspoPage() {
  const router = useRouter();
  const [room, setRoom] = useState('Living room');
  const [style, setStyle] = useState('');
  const [photos, setPhotos] = useState<InspoPhoto[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  const [stories, setStories] = useState<Story[]>([]);

  useEffect(() => {
    editorialStories().then(setStories);
  }, []);

  const q = query(room, style);
  useEffect(() => {
    let live = true;
    setLoading(true);
    setError(undefined);
    setPhotos([]);
    inspoSearch(q, 0)
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
  }, [q]);

  async function loadMore() {
    const next = page + 1;
    setLoading(true);
    try {
      const d = await inspoSearch(q, next);
      setPhotos((list) => [...list, ...d.photos.filter((p) => !list.some((x) => x.id === p.id))]);
      setHasMore(d.hasMore);
      setPage(next);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  function pick(next: { room?: string; style?: string }) {
    setPage(0);
    if (next.room !== undefined) setRoom(next.room);
    if (next.style !== undefined) setStyle(next.style);
  }

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

        {stories.length > 0 && (
          <section style={{ marginBottom: 28 }}>
            <div className="section-head">
              <h2 className="display" style={{ fontSize: 22 }}>From Architectural Digest</h2>
              <span className="tiny muted">Latest stories</span>
            </div>
            <div className="story-row">
              {stories.map((s) => (
                <a key={s.link} className="story" href={s.link} target="_blank" rel="noopener noreferrer">
                  {s.image ? <img src={s.image} alt="" loading="lazy" /> : <div className="story-img" />}
                  <strong>{s.title}</strong>
                  <span className="tiny muted">
                    {s.date && !Number.isNaN(Date.parse(s.date)) ? new Date(s.date).toLocaleDateString() : 'AD'} <IconExternalLink size={11} />
                  </span>
                </a>
              ))}
            </div>
          </section>
        )}

        <section>
          <Chips options={ROOMS} value={room} onChange={(v) => pick({ room: v })} any="Any room" />
          <Chips options={STYLES} value={style} onChange={(v) => pick({ style: v })} any="Any style" />
          {error && <p className="small" style={{ color: 'var(--error)', marginTop: 12 }}>{error}</p>}
          <div className="inspo-grid">
            {photos.map((p) => (
              <figure key={p.id} className="inspo-card">
                <img
                  src={p.src}
                  alt={p.alt}
                  loading="lazy"
                  style={{ aspectRatio: `${p.width} / ${p.height}`, background: p.color }}
                />
                <button className="btn btn-sm inspo-shop" onClick={() => shop(p)}>
                  <IconShoppingBag size={14} /> Shop this look
                </button>
                <figcaption className="tiny muted">
                  Photo by{' '}
                  <a href={p.authorUrl} target="_blank" rel="noopener noreferrer">
                    {p.author}
                  </a>{' '}
                  on{' '}
                  <a href={p.sourceUrl} target="_blank" rel="noopener noreferrer">
                    Unsplash
                  </a>
                </figcaption>
              </figure>
            ))}
          </div>
          {loading && <span className="spinner" style={{ display: 'block', margin: '20px auto' }} />}
          {!loading && !error && photos.length === 0 && <div className="empty">No photos for that combination. Try another style.</div>}
          {!loading && hasMore && (
            <div style={{ textAlign: 'center', marginTop: 16 }}>
              <button className="btn btn-outline" onClick={loadMore}>
                Load more
              </button>
            </div>
          )}
        </section>
        <Disclosure />
      </main>
    </>
  );
}
