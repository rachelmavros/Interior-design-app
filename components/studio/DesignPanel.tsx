'use client';

import { useRef, useState } from 'react';
import { IconBrush, IconPencil, IconSparkles, IconWand } from '@tabler/icons-react';
import { runEdit, setAiMode, toast, useStudio } from '@/lib/client/studio';
import { AiSettings, useEditCost } from './AiSettings';
import { ImportItem } from './ImportItem';
import { QUICK_ITEMS, STYLES } from '@/lib/prompts';

type Mode = 'clear' | 'add' | 'own';

const MODES: { id: Mode; label: string }[] = [
  { id: 'clear', label: 'Clear out' },
  { id: 'add', label: 'Add with AI' },
  { id: 'own', label: 'Add your own item' },
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
  const itemRef = useRef<HTMLTextAreaElement>(null);

  const painted = coverage > 0;
  const needsText = mode === 'add' && !item.trim();
  const ready = painted && !needsText;
  const pct = coverage > 0 ? Math.max(1, Math.round(coverage * 100)) : 0;

  function go() {
    if (!painted) {
      useStudio.setState({ tool: 'brush', compare: false });
      document.querySelector('.stage-wrap')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      toast(mode === 'clear' ? 'Paint over the furniture you want gone, then tap Clear.' : 'Paint the spot where the new piece should go.');
      return;
    }
    if (needsText) {
      itemRef.current?.focus();
      return;
    }
    if (mode === 'clear') runEdit({ mode: 'clear', text: removeText });
    if (mode === 'add') runEdit({ mode: 'add', text: item, style });
  }

  return (
    <div className="stack">
      <div className="segmented" role="tablist" aria-label="Edit type">
        {MODES.map((m) => (
          <button
            key={m.id}
            className={mode === m.id ? 'on' : ''}
            onClick={() => {
              setMode(m.id);
              if (m.id !== 'own') setAiMode(m.id);
            }}
            role="tab"
            aria-selected={mode === m.id}
          >
            {m.label}
          </button>
        ))}
      </div>

      {mode === 'own' ? (
        <ImportItem />
      ) : (
        <>
          <div className={`card-soft ${painted ? '' : 'needs-paint'}`}>
            <div className="mask-status">
              <span className="mask-dot" />
              {painted ? (
                <span>
                  <strong>{pct}%</strong> of the photo selected
                </span>
              ) : (
                <span>
                  <strong>Step 1:</strong>{' '}
                  {mode === 'clear' ? 'paint over the furniture you want gone.' : 'paint the spot where the new piece should go.'}
                </span>
              )}
            </div>
            {!painted && !['brush', 'rect', 'lasso'].includes(tool) && (
              <button className="btn btn-outline btn-sm" style={{ marginTop: 8 }} onClick={() => useStudio.setState({ tool: 'brush', compare: false })}>
                <IconBrush size={15} /> Use the brush
              </button>
            )}
          </div>

          {mode === 'clear' && (
            <div className="describe-card">
              <div className="describe-head">
                <IconSparkles size={16} />
                <span>
                  <strong>Describe it for much better results</strong>
                  <span className="tiny muted">The AI erases and rebuilds far more accurately when you say what’s going and what belongs behind it.</span>
                </span>
              </div>
              <div>
                <label className="label" htmlFor="remove">What are you removing, and what should be behind it?</label>
                <textarea
                  id="remove"
                  className="textarea"
                  value={removeText}
                  onChange={(e) => setRemoveText(e.target.value)}
                  placeholder="e.g. remove the kitchen island and bar stools, and continue the lower cabinets and wood floor behind them"
                  maxLength={600}
                />
              </div>
              <p className="tiny muted">
                Paint generously over each piece <em>and its shadow</em>. Anything outside your paint is never touched.
              </p>
            </div>
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
                  ref={itemRef}
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
                <div className="chips">
                  {STYLES.map((s) => (
                    <button key={s} className={`chip ${style === s ? 'on' : ''}`} onClick={() => setStyle(style === s ? undefined : s)}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          <AiSettings />

          <button
            className={`btn btn-lg btn-block ${ready ? 'btn-accent' : 'btn-outline'}`}
            onClick={go}
            disabled={!!busy}
          >
            {!painted ? (
              <>
                <IconBrush size={18} /> Paint an area first
              </>
            ) : needsText ? (
              <>
                <IconPencil size={18} /> Describe the piece first
              </>
            ) : (
              <>
                {mode === 'clear' ? <IconWand size={18} /> : <IconSparkles size={18} />}
                {mode === 'clear' ? 'Clear painted area' : 'Design it here'}
                {cost && <span className="btn-cost">{cost}</span>}
              </>
            )}
          </button>
        </>
      )}
    </div>
  );
}
