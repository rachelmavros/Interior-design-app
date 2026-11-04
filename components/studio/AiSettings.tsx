'use client';

import { useEffect, useState } from 'react';
import { EditsLeft } from '../AccountButton';
import { useAccount } from '@/lib/client/account';
import { IconChevronDown, IconCoin } from '@tabler/icons-react';
import { setAiPrefs, useStudio } from '@/lib/client/studio';
import { pickSendSize } from '@/lib/client/image';
import { IMAGE_MODELS, MODE_DEFAULTS, QUALITY_LABELS, estimateCost, formatCost, type AiMode, type Quality } from '@/lib/models';

const QUALITY = (Object.keys(QUALITY_LABELS) as Quality[]).map((id) => ({ id, label: QUALITY_LABELS[id] }));

/** Estimated cost of one edit on this photo, for the given task (default: the one being shown). */
export function useEditCost(mode?: AiMode) {
  const prefs = useStudio((s) => s.aiPrefs[mode ?? s.aiMode]);
  const project = useStudio((s) => s.project);
  if (!project) return '';
  const { model, quality } = prefs;
  const size = pickSendSize(project.width, project.height, model, quality);
  return formatCost(estimateCost(model, quality, size.w === size.h));
}

export function AiSettings() {
  const model = useStudio((s) => s.model);
  const models = useStudio((s) => s.models);
  const quality = useStudio((s) => s.quality);
  const aiMode = useStudio((s) => s.aiMode);
  const cost = useEditCost();
  const [open, setOpen] = useState(false);
  const admin = useAccount((s) => s.admin);
  // Best is for admins only; the server refuses it for everyone else too.
  const qualities = QUALITY.filter((q) => q.id !== 'high' || admin);
  useEffect(() => {
    if (!admin && quality === 'high') setAiPrefs({ quality: 'medium' });
  }, [admin, quality]);
  const recommended = MODE_DEFAULTS[aiMode];
  const available = IMAGE_MODELS.filter((m) => models.includes(m.id));
  const current = IMAGE_MODELS.find((m) => m.id === model);

  return (
    <div className="ai-settings">
      <button className="ai-summary" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        <IconCoin size={16} />
        <span>
          <strong>{current?.label ?? model}</strong> · {QUALITY.find((q) => q.id === quality)?.label} ·{' '}
          <span className="muted">{cost} per edit</span>
        </span>
        <IconChevronDown size={15} style={{ marginLeft: 'auto', transform: open ? 'rotate(180deg)' : undefined }} />
      </button>

      {open && (
        <div className="ai-panel">
          <span className="label">AI model for {aiMode === 'clear' ? 'clearing' : 'adding pieces'}</span>
          <div className="model-list">
            {available.map((m) => {
              const size = pickSendSize(4, 3, m.id, quality);
              return (
                <button
                  key={m.id}
                  className={`model-option ${m.id === model ? 'on' : ''}`}
                  onClick={() => setAiPrefs({ model: m.id })}
                  aria-pressed={m.id === model}
                >
                  <span className="model-head">
                    <strong>
                      {m.label}
                      {m.id === recommended.model && <span className="rec-tag">Recommended</span>}
                    </strong>
                    <span className="model-cost">{formatCost(estimateCost(m.id, quality, size.w === size.h))}</span>
                  </span>
                  <span className="tiny muted">{m.blurb}</span>
                  <code className="tiny">{m.id}</code>
                </button>
              );
            })}
          </div>
          <span className="label" style={{ marginTop: 12 }}>Quality</span>
          <div className="segmented">
            {qualities.map((q) => (
              <button key={q.id} className={quality === q.id ? 'on' : ''} onClick={() => setAiPrefs({ quality: q.id })}>
                {q.label}
                {q.id === recommended.quality && ' ★'}
              </button>
            ))}
          </div>
          <p className="tiny muted" style={{ marginTop: 8 }}>
            ★ marks what tested best for this task. Clearing and adding each remember their own settings. Prices are estimates
            from OpenAI’s list price.{admin && ' Premium + Best can take a few minutes.'}
          </p>
        </div>
      )}
      <EditsLeft />
    </div>
  );
}
