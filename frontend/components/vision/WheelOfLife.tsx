"use client";

const AREAS = [
  "Professional",
  "Contribution",
  "Wealth",
  "Spiritual",
  "Personal Growth",
  "Relationships",
  "Health",
];

const N  = AREAS.length;
const CX = 140;
const CY = 140;
const R  = 108;

function angle(i: number) {
  return (2 * Math.PI * i) / N - Math.PI / 2;
}

function polarPt(i: number, radius: number): [number, number] {
  const a = angle(i);
  return [CX + radius * Math.cos(a), CY + radius * Math.sin(a)];
}

function polygonPath(scores: number[]): string {
  return (
    scores
      .map((s, i) => {
        const [x, y] = polarPt(i, (Math.max(0.5, s) / 10) * R);
        return `${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`;
      })
      .join(" ") + "Z"
  );
}

function ringPath(level: number): string {
  return (
    Array.from({ length: N }, (_, i) => {
      const [x, y] = polarPt(i, (level / 10) * R);
      return `${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`;
    }).join(" ") + "Z"
  );
}

function sectorPath(i: number, outerR: number): string {
  const half = Math.PI / N;
  const a0 = angle(i) - half;
  const a1 = angle(i) + half;
  const x1 = CX + outerR * Math.cos(a0);
  const y1 = CY + outerR * Math.sin(a0);
  const x2 = CX + outerR * Math.cos(a1);
  const y2 = CY + outerR * Math.sin(a1);
  return `M${CX},${CY} L${x1.toFixed(2)},${y1.toFixed(2)} A${outerR},${outerR} 0 0,1 ${x2.toFixed(2)},${y2.toFixed(2)} Z`;
}

// 4-pointed sparkle star
function sparklePath(cx: number, cy: number, r: number, ir: number): string {
  const pts: string[] = [];
  for (let i = 0; i < 8; i++) {
    const a = (Math.PI / 4) * i - Math.PI / 2;
    const rad = i % 2 === 0 ? r : ir;
    pts.push(`${i === 0 ? "M" : "L"}${(cx + rad * Math.cos(a)).toFixed(2)},${(cy + rad * Math.sin(a)).toFixed(2)}`);
  }
  return pts.join(" ") + "Z";
}

interface WheelOfLifeProps {
  scores:       number[];
  size?:        number;
  interactive?: boolean;
  activeIndex?: number | null;
  onAreaClick?: (index: number) => void;
}

export default function WheelOfLife({
  scores,
  size = 280,
  interactive = false,
  activeIndex = null,
  onAreaClick,
}: WheelOfLifeProps) {
  const RINGS = [2, 4, 6, 8, 10];

  return (
    <svg viewBox="0 0 280 280" width={size} height={size} style={{ overflow: "visible" }}>
      <defs>
        <radialGradient id="dataFill" cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stopColor="#F97316" stopOpacity="0.22" />
          <stop offset="100%" stopColor="#F97316" stopOpacity="0.08" />
        </radialGradient>
        <radialGradient id="orangeGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stopColor="#F97316" stopOpacity="0.18" />
          <stop offset="60%"  stopColor="#F97316" stopOpacity="0.06" />
          <stop offset="100%" stopColor="#F97316" stopOpacity="0"    />
        </radialGradient>
      </defs>

      {/* Orange ambient glow */}
      <circle cx={CX} cy={CY} r={R + 10} fill="url(#orangeGlow)" />

      {/* Highlighted sector */}
      {interactive && activeIndex !== null && (
        <path d={sectorPath(activeIndex, R + 4)} fill="#F97316" opacity={0.10} />
      )}

      {/* Concentric rings */}
      {RINGS.map((lvl) => (
        <path
          key={lvl}
          d={ringPath(lvl)}
          fill="none"
          stroke="#EA580C"
          strokeWidth={lvl === 10 ? 1.2 : 0.75}
          strokeOpacity={lvl === 10 ? 0.45 : 0.2}
          strokeLinejoin="round"
        />
      ))}

      {/* Spokes */}
      {Array.from({ length: N }, (_, i) => {
        const [x2, y2] = polarPt(i, R);
        return (
          <line key={i}
            x1={CX} y1={CY} x2={x2} y2={y2}
            stroke="#EA580C" strokeWidth={0.75} strokeOpacity={0.25}
          />
        );
      })}

      {/* Dot intersections at each ring × spoke */}
      {RINGS.map((lvl) =>
        Array.from({ length: N }, (_, i) => {
          const [x, y] = polarPt(i, (lvl / 10) * R);
          return (
            <circle key={`${lvl}-${i}`} cx={x} cy={y} r={1.8}
              fill="#EA580C" opacity={0.3} />
          );
        })
      )}

      {/* Data polygon fill */}
      <path d={polygonPath(scores)} fill="url(#dataFill)" />

      {/* Data polygon stroke */}
      <path d={polygonPath(scores)} fill="none"
        stroke="#EA580C" strokeWidth={2} strokeLinejoin="round" />

      {/* Data point dots */}
      {scores.map((s, i) => {
        const [x, y] = polarPt(i, (Math.max(0.5, s) / 10) * R);
        return (
          <circle key={i} cx={x} cy={y} r={4.5}
            fill="#EA580C" stroke="#FFFFFF" strokeWidth={1.5}
            style={interactive ? { cursor: "pointer" } : undefined}
            onClick={() => interactive && onAreaClick?.(i)}
          />
        );
      })}

      {/* Center sparkle */}
      <path
        d={sparklePath(CX, CY, 7, 3)}
        fill="none"
        stroke="#EA580C"
        strokeWidth={1.2}
        strokeOpacity={0.7}
        strokeLinejoin="round"
      />

      {/* Area labels */}
      {Array.from({ length: N }, (_, i) => {
        const [x, y] = polarPt(i, i === 5 ? R + 36 : R + 22);
        const a = angle(i) * (180 / Math.PI);
        const isTop    = a > -120 && a < -60;
        const isBottom = a >   60 && a <  120;
        const baseline = isTop ? "auto" : isBottom ? "hanging" : "middle";
        const isActive = interactive && activeIndex === i;
        return (
          <text key={i} x={x} y={y}
            textAnchor="middle" dominantBaseline={baseline}
            fontSize={7.5} fontWeight={isActive ? 800 : 600}
            fill={isActive ? "#EA580C" : "#1C1917"}
            letterSpacing="0.07em"
            style={{
              fontFamily: "var(--font-geist-sans, sans-serif)",
              userSelect: "none",
              cursor: interactive ? "pointer" : undefined,
            }}
            onClick={() => interactive && onAreaClick?.(i)}
          >
            {AREAS[i].toUpperCase()}
          </text>
        );
      })}

      {/* Invisible hit areas */}
      {interactive && Array.from({ length: N }, (_, i) => (
        <path key={`hit-${i}`}
          d={sectorPath(i, R + 30)}
          fill="transparent"
          style={{ cursor: "pointer" }}
          onClick={() => onAreaClick?.(i)}
        />
      ))}
    </svg>
  );
}
