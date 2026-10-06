'use client';

import { goToVersion, useStudio } from '@/lib/client/studio';

export function VersionStrip() {
  const project = useStudio((s) => s.project)!;
  const urls = useStudio((s) => s.urls);
  const busy = useStudio((s) => s.busy);
  if (project.versions.length < 2) return null;

  return (
    <div className="versions" aria-label="Edit history">
      {project.versions.map((v, i) => (
        <button
          key={v.id}
          className={`version ${i === project.current ? 'on' : ''} ${i > project.current ? 'future' : ''}`}
          onClick={() => goToVersion(i)}
          disabled={!!busy}
          title={v.label}
        >
          {urls[v.id] && <img src={urls[v.id]} alt="" />}
          <span>
            {i + 1}. {v.label}
          </span>
        </button>
      ))}
    </div>
  );
}
