type Sofa = 'box' | 'round' | 'low' | 'tufted' | 'curvy' | 'rolled';
type Legs = 'tapered' | 'metal' | 'turned' | 'none';
type Art = 'circle' | 'color' | 'ink' | 'sea' | 'arch' | 'gold' | 'frame' | 'fan' | 'gallery' | 'none';
type Lamp = 'arc' | 'paper' | 'pendant' | 'rattan' | 'brass' | 'table' | 'none';
type Wall = 'plain' | 'shiplap' | 'brick' | 'stripes';

interface Look {
  wall: string;
  wallStyle?: Wall;
  wall2?: string;
  floor: string;
  rug?: string;
  rugStripe?: string;
  sofa: string;
  sofaShape: Sofa;
  pillow?: string;
  legs: Legs;
  wood: string;
  art: Art;
  artColor?: string;
  lamp: Lamp;
  plants: number;
}

const LOOKS: Record<string, Look> = {
  Modern: { wall: '#eceae6', floor: '#c9c3ba', rug: '#dcd8d1', sofa: '#3f3f3f', sofaShape: 'box', legs: 'metal', wood: '#222', art: 'circle', artColor: '#111', lamp: 'arc', plants: 0 },
  'Mid-century modern': { wall: '#efe4d0', floor: '#a8714a', rug: '#e9d9b8', sofa: '#cf7f2e', sofaShape: 'box', pillow: '#2f5d5a', legs: 'tapered', wood: '#6b3f22', art: 'color', lamp: 'arc', plants: 1 },
  Scandinavian: { wall: '#f5f3ef', floor: '#e2d2b8', rug: '#fbfaf7', sofa: '#cfd3d2', sofaShape: 'round', pillow: '#e8d9c4', legs: 'tapered', wood: '#c9a77c', art: 'frame', artColor: '#9aa79d', lamp: 'paper', plants: 1 },
  Japandi: { wall: '#e9e2d7', floor: '#b39a7b', rug: '#d9cdb9', sofa: '#a99c8b', sofaShape: 'low', legs: 'none', wood: '#5b4636', art: 'ink', lamp: 'paper', plants: 1 },
  Minimalist: { wall: '#f6f5f2', floor: '#e5e2dc', sofa: '#e7e5e0', sofaShape: 'box', legs: 'none', wood: '#bbb', art: 'none', lamp: 'none', plants: 0 },
  Coastal: { wall: '#eef4f5', floor: '#e3d6be', rug: '#f6f3ec', rugStripe: '#7fa3bd', sofa: '#f4f1ea', sofaShape: 'round', pillow: '#5e88a8', legs: 'tapered', wood: '#d8c3a0', art: 'sea', lamp: 'rattan', plants: 1 },
  Boho: { wall: '#ead6c1', floor: '#b48a62', rug: '#c9744d', rugStripe: '#f0d8b0', sofa: '#c4693f', sofaShape: 'curvy', pillow: '#e8c28a', legs: 'none', wood: '#7a5132', art: 'arch', lamp: 'rattan', plants: 3 },
  Industrial: { wall: '#9a6f5c', wallStyle: 'brick', wall2: '#86604f', floor: '#5d5955', rug: '#3e3b38', sofa: '#6c452c', sofaShape: 'tufted', legs: 'metal', wood: '#1e1e1e', art: 'frame', artColor: '#d8d2c8', lamp: 'pendant', plants: 1 },
  Traditional: { wall: '#e8dcc8', floor: '#87573a', rug: '#8c3b33', rugStripe: '#d9b77a', sofa: '#5e705a', sofaShape: 'rolled', pillow: '#d9b77a', legs: 'turned', wood: '#4a2c1a', art: 'gold', artColor: '#7d8f78', lamp: 'table', plants: 0 },
  'Modern farmhouse': { wall: '#f3f1ec', wallStyle: 'shiplap', wall2: '#e3e0d9', floor: '#a88563', rug: '#e9e3d7', sofa: '#e6e1d6', sofaShape: 'round', pillow: '#3b3b3b', legs: 'turned', wood: '#2b2b2b', art: 'frame', artColor: '#c9c1b2', lamp: 'pendant', plants: 1 },
  'Art deco': { wall: '#1f4040', floor: '#262626', rug: '#e7dcc6', rugStripe: '#c9a24b', sofa: '#c9a24b', sofaShape: 'curvy', pillow: '#1f4040', legs: 'metal', wood: '#c9a24b', art: 'fan', lamp: 'brass', plants: 0 },
  Maximalist: { wall: '#f2b8c6', wallStyle: 'stripes', wall2: '#5f9a7a', floor: '#6b2f45', rug: '#e6b23c', rugStripe: '#2f6f8f', sofa: '#b8135a', sofaShape: 'curvy', pillow: '#f5c445', legs: 'turned', wood: '#3a1f12', art: 'gallery', lamp: 'brass', plants: 2 },
};

function WallPattern({ l }: { l: Look }) {
  if (l.wallStyle === 'shiplap')
    return (
      <g stroke={l.wall2} strokeWidth="0.6">
        {[7, 14, 21, 28, 35].map((y) => (
          <line key={y} x1="0" x2="80" y1={y} y2={y} />
        ))}
      </g>
    );
  if (l.wallStyle === 'brick')
    return (
      <g fill={l.wall2}>
        {Array.from({ length: 7 }, (_, r) =>
          Array.from({ length: 9 }, (_, c) => (
            <rect key={`${r}-${c}`} x={c * 10 - (r % 2) * 5} y={r * 6 + 1} width="9" height="5" rx="0.5" />
          )),
        )}
      </g>
    );
  if (l.wallStyle === 'stripes')
    return (
      <g fill={l.wall2}>
        {Array.from({ length: 10 }, (_, i) => (
          <rect key={i} x={i * 8} y="0" width="3" height="42" opacity=".55" />
        ))}
      </g>
    );
  return null;
}

function ArtPiece({ l }: { l: Look }) {
  switch (l.art) {
    case 'circle':
      return (
        <g>
          <rect x="32" y="7" width="16" height="13" fill="#fff" stroke="#222" strokeWidth=".6" />
          <circle cx="40" cy="13.5" r="4" fill={l.artColor} />
        </g>
      );
    case 'color':
      return (
        <g>
          <rect x="31" y="7" width="18" height="13" fill="#f7f1e3" />
          <circle cx="37" cy="14" r="4" fill="#d9572b" />
          <rect x="40" y="10" width="6" height="8" fill="#2f5d5a" />
        </g>
      );
    case 'ink':
      return (
        <g>
          <rect x="35" y="5" width="10" height="17" fill="#f8f5ee" stroke="#cbbfa8" strokeWidth=".5" />
          <path d="M37 17 Q40 9 43 11" stroke="#222" strokeWidth="1.3" fill="none" strokeLinecap="round" />
        </g>
      );
    case 'sea':
      return (
        <g>
          <rect x="30" y="7" width="20" height="13" fill="#cfe2ee" stroke="#fff" strokeWidth="1" />
          <rect x="30" y="14" width="20" height="6" fill="#5e88a8" />
        </g>
      );
    case 'arch':
      return <path d="M34 22 V12 a6 6 0 0 1 12 0 V22 Z" fill="#c9744d" opacity=".75" />;
    case 'gold':
      return <rect x="32" y="6" width="16" height="14" fill={l.artColor} stroke="#c9a24b" strokeWidth="1.6" />;
    case 'frame':
      return <rect x="33" y="7" width="14" height="13" fill={l.artColor} stroke="#222" strokeWidth=".9" />;
    case 'fan':
      return (
        <g fill="none" stroke="#c9a24b" strokeWidth=".9">
          <path d="M30 22 a10 10 0 0 1 20 0" />
          <path d="M33 22 a7 7 0 0 1 14 0" />
          <path d="M36 22 a4 4 0 0 1 8 0" />
        </g>
      );
    case 'gallery':
      return (
        <g stroke="#3a1f12" strokeWidth=".6">
          <rect x="25" y="5" width="8" height="10" fill="#f5c445" />
          <rect x="35" y="4" width="11" height="8" fill="#2f6f8f" />
          <circle cx="51" cy="9" r="4" fill="#fff" />
          <rect x="35" y="14" width="6" height="7" fill="#5f9a7a" />
          <rect x="43" y="15" width="10" height="6" fill="#e6b23c" />
        </g>
      );
    default:
      return null;
  }
}

function Lamp({ l }: { l: Look }) {
  switch (l.lamp) {
    case 'arc':
      return (
        <g>
          <path d="M10 45 V14 Q10 8 20 10" stroke={l.wood} strokeWidth="1" fill="none" />
          <path d="M17 10 h7 l-2 4 h-3 z" fill={l.wood} />
        </g>
      );
    case 'paper':
      return (
        <g>
          <line x1="14" y1="0" x2="14" y2="8" stroke="#888" strokeWidth=".4" />
          <ellipse cx="14" cy="12" rx="5" ry="4.5" fill="#fbf7ee" stroke="#e1d8c6" strokeWidth=".5" />
        </g>
      );
    case 'pendant':
      return (
        <g>
          <line x1="14" y1="0" x2="14" y2="8" stroke="#222" strokeWidth=".5" />
          <path d="M10 13 L12 8 h4 L18 13 Z" fill="#222" />
        </g>
      );
    case 'rattan':
      return (
        <g>
          <line x1="14" y1="0" x2="14" y2="7" stroke="#7a5132" strokeWidth=".4" />
          <path d="M8 14 a6 6 0 0 1 12 0 Z" fill="#c9a06b" />
        </g>
      );
    case 'brass':
      return (
        <g>
          <line x1="11" y1="45" x2="11" y2="20" stroke="#c9a24b" strokeWidth="1" />
          <path d="M7 20 h8 l-2 -5 h-4 z" fill="#c9a24b" />
        </g>
      );
    case 'table':
      return (
        <g>
          <rect x="7" y="34" width="8" height="11" fill={l.wood} />
          <rect x="10.4" y="28" width="1.2" height="6" fill="#c9a24b" />
          <path d="M7 28 h8 l-2 -5 h-4 z" fill="#efe3c8" />
        </g>
      );
    default:
      return null;
  }
}

function Plant({ x, s = 1 }: { x: number; s?: number }) {
  return (
    <g transform={`translate(${x} 0)`}>
      <rect x="-3" y={45 - 7 * s} width="6" height={7 * s} rx="1" fill="#b7835a" />
      <circle cx="-2" cy={45 - 9 * s} r={3.2 * s} fill="#5f8a55" />
      <circle cx="2.5" cy={45 - 11 * s} r={3.6 * s} fill="#6f9c62" />
      <circle cx="0" cy={45 - 14 * s} r={3 * s} fill="#557e4c" />
    </g>
  );
}

function Sofa({ l }: { l: Look }) {
  const low = l.sofaShape === 'low';
  const top = low ? 31 : 27;
  const seatY = low ? 36 : 34;
  const bottom = low ? 44 : 42;
  const r = l.sofaShape === 'round' || l.sofaShape === 'curvy' ? 4 : l.sofaShape === 'rolled' ? 3 : 1;
  const legsY = bottom;
  return (
    <g>
      {l.legs !== 'none' && (
        <g fill={l.wood}>
          {[22, 57].map((x) =>
            l.legs === 'tapered' ? (
              <path key={x} d={`M${x} ${legsY} h2 l-.6 4 h-.8 z`} />
            ) : l.legs === 'turned' ? (
              <rect key={x} x={x} y={legsY} width="1.8" height="3" rx=".9" />
            ) : (
              <rect key={x} x={x} y={legsY} width="1" height="3" />
            ),
          )}
        </g>
      )}
      <rect x="19" y={top} width="42" height={seatY - top + 2} rx={r} fill={l.sofa} />
      <rect x="18" y={seatY} width="44" height={bottom - seatY} rx={r} fill={l.sofa} />
      <rect x="18" y={seatY} width="44" height={bottom - seatY} rx={r} fill="#000" opacity=".08" />
      {(l.sofaShape === 'rolled' || l.sofaShape === 'curvy') && (
        <g fill={l.sofa}>
          <rect x="15" y={seatY - 4} width="6" height={bottom - seatY + 4} rx="3" />
          <rect x="59" y={seatY - 4} width="6" height={bottom - seatY + 4} rx="3" />
        </g>
      )}
      {l.sofaShape === 'tufted' && (
        <g fill="#000" opacity=".25">
          {[26, 33, 40, 47, 54].map((x) => (
            <circle key={x} cx={x} cy={top + 3} r=".7" />
          ))}
        </g>
      )}
      {l.pillow && (
        <g fill={l.pillow}>
          <rect x="23" y={seatY - 5} width="7" height="6" rx="1.5" transform={`rotate(-8 26 ${seatY - 2})`} />
          <rect x="50" y={seatY - 5} width="7" height="6" rx="1.5" transform={`rotate(8 53 ${seatY - 2})`} />
        </g>
      )}
    </g>
  );
}

export function StyleSwatch({ style }: { style: string }) {
  const l = LOOKS[style];
  if (!l) return null;
  return (
    <svg viewBox="0 0 80 60" className="style-swatch" aria-hidden>
      <rect width="80" height="42" fill={l.wall} />
      <WallPattern l={l} />
      <rect y="42" width="80" height="18" fill={l.floor} />
      {l.rug && <ellipse cx="40" cy="51" rx="28" ry="5.5" fill={l.rug} />}
      {l.rugStripe && <ellipse cx="40" cy="51" rx="20" ry="3.2" fill="none" stroke={l.rugStripe} strokeWidth="1.2" />}
      <ArtPiece l={l} />
      <Lamp l={l} />
      <Sofa l={l} />
      {l.plants > 0 && <Plant x={71} />}
      {l.plants > 1 && <Plant x={6} s={0.8} />}
      {l.plants > 2 && <Plant x={64} s={0.6} />}
    </svg>
  );
}
