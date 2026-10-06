'use client';

import {
  IconArrowBackUp,
  IconArrowForwardUp,
  IconBrush,
  IconColumns2,
  IconDownload,
  IconEraser,
  IconEraserOff,
  IconHandFinger,
  IconLasso,
  IconSquareDashed,
  IconShoppingBagSearch,
  IconArrowsExchange,
  IconRotate2,
} from '@tabler/icons-react';
import {
  clearMask,
  invertMask,
  redo,
  undo,
  undoMask,
  useStudio,
  type Tool,
} from '@/lib/client/studio';

const TOOLS: { id: Tool; label: string; Icon: typeof IconBrush }[] = [
  { id: 'move', label: 'Move products', Icon: IconHandFinger },
  { id: 'brush', label: 'Paint area', Icon: IconBrush },
  { id: 'eraser', label: 'Erase paint', Icon: IconEraser },
  { id: 'rect', label: 'Box area', Icon: IconSquareDashed },
  { id: 'lasso', label: 'Lasso area', Icon: IconLasso },
];

export function Toolbar() {
  const tool = useStudio((s) => s.tool);
  const brush = useStudio((s) => s.brush);
  const compare = useStudio((s) => s.compare);
  const project = useStudio((s) => s.project)!;
  const urls = useStudio((s) => s.urls);
  const busy = useStudio((s) => s.busy);
  const hasMaskHistory = useStudio((s) => s.maskHistory.length > 0);
  const coverage = useStudio((s) => s.maskCoverage);

  const setTool = (t: Tool) => useStudio.setState({ tool: t, compare: false });
  const current = project.versions[project.current];

  return (
    <div className="toolbar" role="toolbar" aria-label="Editing tools">
      {TOOLS.map(({ id, label, Icon }) => (
        <button
          key={id}
          className={`icon-btn ${tool === id && !compare ? 'active' : ''}`}
          onClick={() => setTool(id)}
          title={label}
          aria-label={label}
          aria-pressed={tool === id}
        >
          <Icon size={19} />
        </button>
      ))}
      {(tool === 'brush' || tool === 'eraser') && (
        <label className="brush-size" title="Brush size">
          <span className="sr-only">Brush size</span>
          <input
            type="range"
            min={6}
            max={120}
            value={brush}
            onChange={(e) => useStudio.setState({ brush: Number(e.target.value) })}
          />
        </label>
      )}
      <div className="sep" />
      <button className="icon-btn" onClick={undoMask} disabled={!hasMaskHistory} title="Undo paint" aria-label="Undo paint">
        <IconRotate2 size={19} style={{ transform: 'scaleX(-1)' }} />
      </button>
      <button className="icon-btn" onClick={invertMask} title="Invert painted area" aria-label="Invert painted area">
        <IconArrowsExchange size={19} />
      </button>
      <button className="icon-btn" onClick={clearMask} disabled={coverage === 0} title="Clear paint" aria-label="Clear paint">
        <IconEraserOff size={19} />
      </button>
      <div className="sep" />
      <button
        className={`icon-btn ${tool === 'shop' && !compare ? 'active' : ''}`}
        onClick={() => setTool('shop')}
        title="Select anything to shop it"
        aria-label="Shop a selection"
      >
        <IconShoppingBagSearch size={19} />
      </button>
      <div className="spacer" />
      <button
        className={`icon-btn ${compare ? 'active' : ''}`}
        onClick={() => useStudio.setState({ compare: !compare })}
        disabled={project.current === 0}
        title="Compare with original"
        aria-label="Compare with original"
      >
        <IconColumns2 size={19} />
      </button>
      <button className="icon-btn" onClick={undo} disabled={project.current === 0 || !!busy} title="Undo edit" aria-label="Undo edit">
        <IconArrowBackUp size={19} />
      </button>
      <button
        className="icon-btn"
        onClick={redo}
        disabled={project.current >= project.versions.length - 1 || !!busy}
        title="Redo edit"
        aria-label="Redo edit"
      >
        <IconArrowForwardUp size={19} />
      </button>
      <a
        className="icon-btn"
        href={urls[current.id]}
        download={`${project.name.replace(/[^\w-]+/g, '-')}.jpg`}
        title="Download image"
        aria-label="Download image"
      >
        <IconDownload size={19} />
      </a>
    </div>
  );
}
