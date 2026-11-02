'use client';

import { goToVersion, lineage, parentIndex, useStudio } from '@/lib/client/studio';
import { aiTag } from '@/lib/models';

export function VersionStrip() {
  const project = useStudio((s) => s.project)!;
  const urls = useStudio((s) => s.urls);
  const busy = useStudio((s) => s.busy);
  if (project.versions.length < 2) return null;
  const onPath = new Set(lineage(project));

  return (
    <div className="versions" aria-label="Edit history">
      {project.versions.map((v, i) => {
        const parent = parentIndex(project, i);
        const branched = i > 0 && parent !== i - 1;
        const tag = v.ai && aiTag(v.ai.model, v.ai.quality);
        return (
          <button
            key={v.id}
            className={`version ${i === project.current ? 'on' : ''} ${onPath.has(i) ? '' : 'off-path'}`}
            onClick={() => goToVersion(i)}
            disabled={!!busy}
            title={(branched ? `${v.label} (edited from #${parent + 1})` : v.label) + (tag ? ` · ${tag}` : '')}
          >
            {urls[v.id] && <img src={urls[v.id]} alt="" />}
            <span>
              {i + 1}. {branched && <em className="branch">from #{parent + 1} · </em>}
              {v.label}
            </span>
            {tag && <small className="version-ai">{tag}</small>}
          </button>
        );
      })}
    </div>
  );
}
