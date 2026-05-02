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

const N = AREAS.length;
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

// Pie-slice hit area for each area segment
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

interface WheelOfLifeProps {
  scores:        number[];
  size?:         number;
  interactive?:  boolean;
  activeIndex?:  number | null;
  onAreaClick?:  (index: number) => void;
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
    <svg
      viewBox="0 0 280 280"
      width={size}
      height={size}
      style={{ overflow: "visible" }}
    >
      <defs>
        <radialGradient id="wheelGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stopColor="#FFF7ED" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#FAF5EE" stopOpacity="0"   />
        </radialGradient>
        <radialGradient id="dataGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stopColor="#F97316" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#F97316" stopOpacity="0.08" />
        </radialGradient>
      </defs>

      {/* Background glow */}
      <circle cx={CX} cy={CY} r={R + 20} fill="url(#wheelGlow)" />

      {/* Highlighted sector (interactive) */}
      {interactive && activeIndex !== null && (
        <path
          d={sectorPath(activeIndex, R + 4)}
          fill="#F97316"
          opacity={0.12}
        />
      )}

      {/* Concentric rings */}
      {RINGS.map((lvl) => (
        <path
          key={lvl}
          d={ringPath(lvl)}
          fill="none"
          stroke="#E8DDD0"
          strokeWidth={lvl === 10 ? 1.5 : 0.75}
          strokeOpacity={lvl === 10 ? 0.8 : 0.5}
        />
      ))}

      {/* Axis lines */}
      {Array.from({ length: N }, (_, i) => {
        const [x2, y2] = polarPt(i, R);
        return (
          <line key={i} x1={CX} y1={CY} x2={x2} y2={y2}
            stroke="#E8DDD0" strokeWidth={0.75} strokeOpacity={0.6} />
        );
      })}

      {/* Filled data polygon */}
      <path d={polygonPath(scores)} fill="url(#dataGlow)" />
      <path d={polygonPath(scores)} fill="none"
        stroke="#F97316" strokeWidth={1.75} strokeLinejoin="round" strokeOpacity={0.9} />

      {/* Data point dots */}
      {scores.map((s, i) => {
        const [x, y] = polarPt(i, (Math.max(0.5, s) / 10) * R);
        return (
          <circle key={i} cx={x} cy={y} r={3.5}
            fill="#FFFFFF" stroke="#F97316" strokeWidth={2}
            style={interactive ? { cursor: "pointer" } : undefined}
            onClick={() => interactive && onAreaClick?.(i)}
          />
        );
      })}

      {/* Center dot */}
      <circle cx={CX} cy={CY} r={5}   fill="#F97316" opacity={0.6} />
      <circle cx={CX} cy={CY} r={2.5} fill="#FFFFFF" />

      {/* Area labels */}
      {Array.from({ length: N }, (_, i) => {
        const [x, y] = polarPt(i, R + 20);
        const a = angle(i) * (180 / Math.PI);
        const isTop    = a > -120 && a < -60;
        const isBottom = a >   60 && a <  120;
        const baseline = isTop ? "auto" : isBottom ? "hanging" : "middle";
        const isActive = interactive && activeIndex === i;
        return (
          <text key={i} x={x} y={y}
            textAnchor="middle" dominantBaseline={baseline}
            fontSize={7.5} fontWeight={isActive ? 700 : 600}
            fill={isActive ? "#F97316" : "#44403C"}
            letterSpacing="0.06em"
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

      {/* Invisible sector hit areas — placed last so they're on top */}
      {interactive && Array.from({ length: N }, (_, i) => (
        <path
          key={`hit-${i}`}
          d={sectorPath(i, R + 30)}
          fill="transparent"
          style={{ cursor: "pointer" }}
          onClick={() => onAreaClick?.(i)}
        />
      ))}
    </svg>
  );
}
