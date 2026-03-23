"use client";

// SVG rank insignia for U.S. military officers and senior NCOs.
// Renders the appropriate insignia (stars, eagle, oak leaf, bars, chevrons)
// based on rank string and branch of service.

interface Props {
  rank: string;
  branch: string;
  size?: number;
}

type InsigniaType =
  | { type: "stars"; count: number }
  | { type: "eagle" }
  | { type: "oak-leaf"; color: "silver" | "gold" }
  | { type: "bars"; count: number; color: "silver" | "gold" }
  | { type: "chevrons"; count: number; rockers?: number }
  | { type: "none" };

function getInsignia(rank: string, branch: string): InsigniaType {
  const r = rank.toLowerCase().trim();
  const isNavy = /navy|coast guard/i.test(branch);

  // 5-star
  if (/general of the army|fleet admiral|general of the air force/i.test(r))
    return { type: "stars", count: 5 };
  // 4-star
  if (/^general$/i.test(r) || /^admiral$/i.test(r))
    return { type: "stars", count: 4 };
  // 3-star
  if (/lieutenant general|vice admiral/i.test(r))
    return { type: "stars", count: 3 };
  // 2-star
  if (/major general|rear admiral.*upper/i.test(r))
    return { type: "stars", count: 2 };
  // 1-star
  if (/brigadier|rear admiral/i.test(r))
    return { type: "stars", count: 1 };

  // Colonel / Navy Captain (O-6)
  if (/colonel/i.test(r) || (isNavy && /^captain$/i.test(r)))
    return { type: "eagle" };

  // Lt Colonel / Commander (O-5)
  if (/lieutenant colonel|commander/i.test(r))
    return { type: "oak-leaf", color: "silver" };

  // Major / Lt Commander (O-4)
  if (/^major$/i.test(r) || /lieutenant commander/i.test(r))
    return { type: "oak-leaf", color: "gold" };

  // Captain (O-3) — Army/AF/MC
  if (/captain/i.test(r))
    return { type: "bars", count: 2, color: "silver" };

  // First Lieutenant / Lt(JG) (O-2)
  if (/first lieutenant/i.test(r) || /lieutenant.*junior/i.test(r))
    return { type: "bars", count: 1, color: "silver" };

  // Second Lieutenant / Ensign (O-1)
  if (/second lieutenant|ensign/i.test(r))
    return { type: "bars", count: 1, color: "gold" };

  // Senior NCOs
  if (/sergeant major|master chief|command sergeant/i.test(r))
    return { type: "chevrons", count: 3, rockers: 3 };
  if (/master sergeant|first sergeant|senior chief/i.test(r))
    return { type: "chevrons", count: 3, rockers: 3 };
  if (/sergeant first class|chief petty/i.test(r))
    return { type: "chevrons", count: 3, rockers: 2 };
  if (/staff sergeant|petty officer.*first|technical sergeant/i.test(r))
    return { type: "chevrons", count: 3, rockers: 1 };
  if (/^sergeant$|petty officer.*second/i.test(r))
    return { type: "chevrons", count: 3 };
  if (/corporal|specialist|petty officer.*third/i.test(r))
    return { type: "chevrons", count: 2 };
  if (/private first class|lance corporal|airman first/i.test(r))
    return { type: "chevrons", count: 1 };

  return { type: "none" };
}

function starPath(cx: number, cy: number, R: number, r: number): string {
  return Array.from({ length: 10 }, (_, i) => {
    const angle = (i * 36 - 90) * (Math.PI / 180);
    const rad = i % 2 === 0 ? R : r;
    return `${(cx + rad * Math.cos(angle)).toFixed(2)},${(cy + rad * Math.sin(angle)).toFixed(2)}`;
  }).join(" ");
}

function StarsInsignia({ count, size }: { count: number; size: number }) {
  const starR = size * 0.38;
  const starr = starR * 0.4;
  const gap = starR * 2.4;
  const totalW = count * gap;
  const h = size;

  return (
    <svg width={totalW} height={h} viewBox={`0 0 ${totalW} ${h}`}>
      {Array.from({ length: count }, (_, i) => (
        <polygon
          key={i}
          points={starPath(i * gap + gap / 2, h / 2, starR, starr)}
          fill="#C0C0C0"
          stroke="#999"
          strokeWidth={0.8}
        />
      ))}
    </svg>
  );
}

function EagleInsignia({ size }: { size: number }) {
  // Simplified eagle silhouette
  const s = size;
  return (
    <svg width={s * 1.2} height={s} viewBox="0 0 48 40" fill="#C0C0C0" stroke="#888" strokeWidth={0.5}>
      {/* Body */}
      <ellipse cx={24} cy={22} rx={6} ry={8} />
      {/* Head */}
      <circle cx={24} cy={12} r={4} />
      <polygon points="24,8 22.5,6 25.5,6" fill="#DAA520" stroke="none" />
      {/* Left wing */}
      <path d="M18,22 Q6,12 2,16 Q8,20 14,24 Z" />
      {/* Right wing */}
      <path d="M30,22 Q42,12 46,16 Q40,20 34,24 Z" />
      {/* Tail */}
      <path d="M20,30 L24,38 L28,30 Z" />
      {/* Shield on chest */}
      <rect x={21.5} y={18} width={5} height={7} rx={0.5} fill="#00529B" stroke="#DAA520" strokeWidth={0.6} />
      <line x1={21.5} y1={20} x2={26.5} y2={20} stroke="#CC0000" strokeWidth={1} />
      <line x1={21.5} y1={22} x2={26.5} y2={22} stroke="#CC0000" strokeWidth={1} />
    </svg>
  );
}

function OakLeafInsignia({ size, color }: { size: number; color: "silver" | "gold" }) {
  const fill = color === "silver" ? "#C0C0C0" : "#DAA520";
  const stroke = color === "silver" ? "#888" : "#996515";
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill={fill} stroke={stroke} strokeWidth={0.8}>
      {/* Central stem */}
      <line x1={20} y1={8} x2={20} y2={36} strokeWidth={1.5} />
      {/* Leaf lobes — simplified oak leaf shape */}
      <ellipse cx={14} cy={14} rx={6} ry={4} transform="rotate(-30 14 14)" />
      <ellipse cx={26} cy={14} rx={6} ry={4} transform="rotate(30 26 14)" />
      <ellipse cx={12} cy={22} rx={5} ry={3.5} transform="rotate(-20 12 22)" />
      <ellipse cx={28} cy={22} rx={5} ry={3.5} transform="rotate(20 28 22)" />
      <ellipse cx={14} cy={29} rx={4.5} ry={3} transform="rotate(-10 14 29)" />
      <ellipse cx={26} cy={29} rx={4.5} ry={3} transform="rotate(10 26 29)" />
      {/* Top bud */}
      <ellipse cx={20} cy={9} rx={3} ry={4} />
    </svg>
  );
}

function BarsInsignia({ count, size, color }: { count: number; size: number; color: "silver" | "gold" }) {
  const fill = color === "silver" ? "#C0C0C0" : "#DAA520";
  const stroke = color === "silver" ? "#888" : "#996515";
  const barW = size * 0.35;
  const barH = size * 0.8;
  const gap = size * 0.15;
  const totalW = count * barW + (count - 1) * gap;

  return (
    <svg width={totalW} height={barH} viewBox={`0 0 ${totalW} ${barH}`}>
      {Array.from({ length: count }, (_, i) => (
        <rect
          key={i}
          x={i * (barW + gap)}
          y={0}
          width={barW}
          height={barH}
          rx={2}
          fill={fill}
          stroke={stroke}
          strokeWidth={0.8}
        />
      ))}
    </svg>
  );
}

function ChevronsInsignia({ count, rockers = 0, size }: { count: number; rockers?: number; size: number }) {
  const h = size;
  const w = size * 1.2;
  const chevH = 5;
  const gap = 2;
  const startY = 6;

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      {/* Chevrons (V shapes pointing up) */}
      {Array.from({ length: count }, (_, i) => {
        const y = startY + i * (chevH + gap);
        return (
          <polyline
            key={`c${i}`}
            points={`${4},${y + chevH} ${w / 2},${y} ${w - 4},${y + chevH}`}
            fill="none"
            stroke="#DAA520"
            strokeWidth={3}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        );
      })}
      {/* Rockers (arcs below chevrons) */}
      {Array.from({ length: rockers }, (_, i) => {
        const y = startY + count * (chevH + gap) + i * (chevH + gap);
        return (
          <path
            key={`r${i}`}
            d={`M${4},${y} Q${w / 2},${y + chevH + 2} ${w - 4},${y}`}
            fill="none"
            stroke="#DAA520"
            strokeWidth={3}
            strokeLinecap="round"
          />
        );
      })}
    </svg>
  );
}

export default function RankInsignia({ rank, branch, size = 48 }: Props) {
  const insignia = getInsignia(rank, branch);

  if (insignia.type === "none") return null;

  if (insignia.type === "stars")
    return <StarsInsignia count={insignia.count} size={size} />;
  if (insignia.type === "eagle")
    return <EagleInsignia size={size} />;
  if (insignia.type === "oak-leaf")
    return <OakLeafInsignia size={size} color={insignia.color} />;
  if (insignia.type === "bars")
    return <BarsInsignia count={insignia.count} size={size} color={insignia.color} />;
  if (insignia.type === "chevrons")
    return <ChevronsInsignia count={insignia.count} rockers={insignia.rockers} size={size} />;

  return null;
}
