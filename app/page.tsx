'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { IconArrowRight, IconSparkles, IconTag, IconTrash } from '@tabler/icons-react';
import { SiteHeader } from '@/components/SiteHeader';
import { PhotoPicker } from '@/components/PhotoPicker';
import { Disclosure } from '@/components/Disclosure';
import { createProject, deleteProject, getBlob, listProjects, type Project } from '@/lib/client/db';
import { prepareUpload } from '@/lib/client/image';

function ProjectCard({ p, onDelete }: { p: Project; onDelete: () => void }) {
  const [thumb, setThumb] = useState<string>();
  useEffect(() => {
    let url: string | undefined;
    getBlob(p.versions[p.current].id).then((b) => {
      if (b) setThumb((url = URL.createObjectURL(b)));
    });
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [p]);

  return (
    <Link href={`/studio/${p.id}`} className="project-card">
      {thumb ? <img className="project-thumb" src={thumb} alt="" /> : <div className="project-thumb" />}
      <div className="project-meta">
        <strong>{p.name}</strong>
        <span className="tiny muted">
          {p.versions.length - 1} edit{p.versions.length === 2 ? '' : 's'} · {new Date(p.updatedAt).toLocaleDateString()}
        </span>
      </div>
      <button
        className="icon-btn project-del"
        aria-label={`Delete ${p.name}`}
        onClick={(e) => {
          e.preventDefault();
          if (confirm(`Delete “${p.name}”? This can’t be undone.`)) onDelete();
        }}
      >
        <IconTrash size={16} />
      </button>
    </Link>
  );
}

export default function Home() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listProjects().then(setProjects).catch(() => setProjects([]));
  }, []);

  async function start(file: File) {
    setBusy(true);
    setError(null);
    try {
      const { blob, width, height } = await prepareUpload(file);
      const n = (projects?.length || 0) + 1;
      const p = await createProject(`My room ${n}`, blob, width, height);
      router.push(`/studio/${p.id}`);
    } catch {
      setError('That photo couldn’t be opened. Try a JPG or PNG.');
      setBusy(false);
    }
  }

  return (
    <>
      <SiteHeader />
      <main className="page">
        <section className="hero">
          <div>
            <h1 className="display">
              See it in <em>your</em> room.
              <br />
              Then shop it.
            </h1>
            <p className="lead">
              Snap your space, clear out what’s there without warping a single wall, and try new pieces — dreamt up by AI or
              pulled from real stores. Every piece links straight to where you can buy it.
            </p>
            <PhotoPicker onFile={start} busy={busy} />
            {error && <p className="small" style={{ color: 'var(--error)', marginTop: 8 }}>{error}</p>}
            <div className="hero-ctas" style={{ marginTop: 14 }}>
              <Link href="/shop" className="btn btn-outline">
                Just shop from a photo <IconArrowRight size={16} />
              </Link>
            </div>
          </div>
          <div className="hero-art" aria-hidden>
            <div className="hero-card a">
              <svg className="hero-room" viewBox="0 0 400 300" preserveAspectRatio="none">
                <polygon points="0,0 400,0 330,190 70,190" fill="#efe8dd" />
                <polygon points="70,190 330,190 400,300 0,300" fill="#cdb79c" />
                <rect x="240" y="40" width="70" height="95" fill="#f8f4ec" stroke="#d9cdbd" strokeWidth="3" />
              </svg>
            </div>
            <div className="hero-card b">
              <svg className="hero-room" viewBox="0 0 400 300" preserveAspectRatio="none">
                <polygon points="0,0 400,0 330,190 70,190" fill="#e8ddd0" />
                <polygon points="70,190 330,190 400,300 0,300" fill="#c4ab8d" />
                <rect x="240" y="40" width="70" height="95" fill="#f8f4ec" stroke="#d9cdbd" strokeWidth="3" />
                <rect x="95" y="160" width="190" height="60" rx="18" fill="#f3ece2" />
                <rect x="95" y="130" width="190" height="45" rx="16" fill="#ebe1d3" />
                <ellipse cx="190" cy="262" rx="120" ry="22" fill="#a88d6f" opacity=".5" />
                <rect x="160" y="236" width="70" height="16" rx="8" fill="#7a5c41" />
              </svg>
            </div>
            <span className="hero-tag" style={{ left: '46%', top: '52%' }}>
              <IconTag size={14} color="#b4552d" /> Bouclé sofa · $1,299
            </span>
            <span className="hero-tag" style={{ left: '4%', top: '62%' }}>
              <IconSparkles size={14} color="#b4552d" /> Walls untouched
            </span>
          </div>
        </section>

        <section className="steps">
          <div className="step">
            <div className="step-num">1</div>
            <h3>Clear the room</h3>
            <p className="small muted">Paint over what you want gone. AI fills in the floor and walls behind it — the rest of your photo stays exactly as shot.</p>
          </div>
          <div className="step">
            <div className="step-num">2</div>
            <h3>Design it</h3>
            <p className="small muted">Describe a piece and AI places it with real perspective and shadows — or drop in actual products from stores.</p>
          </div>
          <div className="step">
            <div className="step-num">3</div>
            <h3>Shop the look</h3>
            <p className="small muted">Google Lens finds every piece across retailers, with prices, reviews and filters.</p>
          </div>
        </section>

        <section>
          <div className="section-head" id="rooms">
            <h2 className="display">Your rooms</h2>
            <span className="tiny muted">Saved on this device</span>
          </div>
          {projects === null ? (
            <span className="spinner" />
          ) : projects.length === 0 ? (
            <div className="empty small">No rooms yet — upload a photo above to start your first design.</div>
          ) : (
            <div className="projects">
              {projects.map((p) => (
                <ProjectCard
                  key={p.id}
                  p={p}
                  onDelete={async () => {
                    await deleteProject(p);
                    setProjects((list) => list?.filter((x) => x.id !== p.id) ?? null);
                  }}
                />
              ))}
            </div>
          )}
        </section>
        <Disclosure />
      </main>
    </>
  );
}
