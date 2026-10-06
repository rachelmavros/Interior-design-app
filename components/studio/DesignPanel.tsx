'use client';

import { useState } from 'react';
import { IconSparkles, IconWand, IconTrash } from '@tabler/icons-react';
import { runEdit, useStudio } from '@/lib/client/studio';
import { AiSettings, useEditCost } from './AiSettings';
import { StyleSwatch } from './StyleSwatch';
import { QUICK_ITEMS, STYLES } from '@/lib/prompts';

type Mode = 'clear' | 'add' | 'custom';

const MODES: { id: Mode; label: string }[] = [
  { id: 'clear', label: 'Clear out' },
  { id: 'add', label: 'Add with AI' },
  { id: 'custom', label: 'Custom' },
];

export function DesignPanel() {
  const coverage = useStudio((s) => s.maskCoverage);
  const cost = useEditCost();
  const busy = useStudio((s) => s.busy);
  const tool = useStudio((s) => s.tool);
  const [mode, setMode] = useState<Mode>('clear');
  const [removeText, setRemoveText] = useState('');
  const [item, setItem] = useState('');
  const [style, setStyle] = useState<string | undefined>();
  const [custom, setCustom] = useState('');

  const painted = coverage > 0;
  const needsText = (mode === 'add' && !item.trim()) || (mode === 'custom' && !custom.trim());
  const pct = coverage > 0 ? Math.max(1, Math.round(coverage * 100)) : 0;

  function go() {
    if (mode === 'clear') runEdit({ mode: 'clear', text: removeText });
    if (mode === 'add') runEdit({ mode: 'add', text: item, style });
    if (mode === 'custom') runEdit({ mode: 'custom', text: custom });
  }

  return (
    <div className="stack">
      <div className="segmented" role="tablist" aria-label="Edit type">
        {MODES.map((m) => (
          <button key={m.id} className={mode === m.id ? 'on' : ''} onClick={() => setMode(m.id)} role="tab" aria-selected={mode === m.id}>
            {m.label}
          </button>
        ))}
      </div>

      <div className="card-soft">
        <div className="mask-status">
          <span className="mask-dot" />
          {painted ? (
            <span>
              <strong>{pct}%</strong> of the photo selected
            </span>
          ) : (
            <span>
              {mode === 'clear' ? 'Paint over the furniture you want gone.' : 'Paint where the new piece should go.'}
            </span>
          )}
        </div>
        {!painted && !['brush', 'rect', 'lasso'].includes(tool) && (
          <button className="btn btn-outline btn-sm" style={{ marginTop: 8 }} onClick={() => useStudio.setState({ tool: 'brush', compare: false })}>
            Use the brush
          </button>
        )}
      </div>

      {mode === 'clear' && (
        <>
          <div>
            <label className="label" htmlFor="remove">What are you removing? (optional)</label>
            <input
              id="remove"
              className="input"
              value={removeText}
              onChange={(e) => setRemoveText(e.target.value)}
              placeholder="e.g. the sofa, coffee table and rug"
            />
          </div>
          <p className="tiny muted">
            Tip: paint generously over each piece <em>and its shadow</em>. Walls, windows and floors outside your paint are
            never touched — they’re copied pixel-for-pixel from your photo.
          </p>
        </>
      )}

      {mode === 'add' && (
        <>
          <div>
            <span className="label">Quick picks</span>
            <div className="chips">
              {QUICK_ITEMS.map((q) => (
                <button key={q} className={`chip ${item.toLowerCase() === q.toLowerCase() ? 'on' : ''}`} onClick={() => setItem(q.toLowerCase())}>
                  {q}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="label" htmlFor="item">Describe the piece</label>
            <textarea
              id="item"
              className="textarea"
              value={item}
              onChange={(e) => setItem(e.target.value)}
              placeholder="e.g. a cream bouclé three-seat sofa with rounded arms and oak legs"
              maxLength={600}
            />
          </div>
          <div>
            <span className="label">Style</span>
            <div className="style-grid">
              {STYLES.map((s) => (
                <button
                  key={s}
                  className={`style-card ${style === s ? 'on' : ''}`}
                  onClick={() => setStyle(style === s ? undefined : s)}
                  aria-pressed={style === s}
                >
                  <StyleSwatch style={s} />
                  <span>{s}</span>
                </button>
              ))}
            </div>
          </div>
          <p className="tiny muted">The AI is asked to design a realistic, buyable piece so you can shop lookalikes right after.</p>
        </>
      )}

      {mode === 'custom' && (
        <div>
          <label className="label" htmlFor="custom">What should change in the painted area?</label>
          <textarea
            id="custom"
            className="textarea"
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            placeholder="e.g. paint this wall a warm sage green · swap the floor for light oak herringbone · add sheer linen curtains"
            maxLength={600}
          />
        </div>
      )}

      <AiSettings />

      <button className="btn btn-accent btn-lg btn-block" onClick={go} disabled={!!busy || !painted || needsText}>
        {mode === 'clear' ? <IconTrash size={18} /> : mode === 'add' ? <IconSparkles size={18} /> : <IconWand size={18} />}
        {mode === 'clear' ? 'Clear painted area' : mode === 'add' ? 'Design it here' : 'Apply edit'}
        {cost && <span className="btn-cost">{cost}</span>}
      </button>
    </div>
  );
}
