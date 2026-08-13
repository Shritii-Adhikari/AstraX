"use client";

interface Props {
  aprPct: number; // estimated fee APR, percent
}

// Estimated fee APR donut (illustrative). Real APR needs indexed 24h volume;
// this scales an assumed baseline by the range concentration multiplier so the
// number responds correctly to range tightness (narrow range → higher APR).
export default function AprDonut({ aprPct }: Props) {
  const R = 26;
  const C = 2 * Math.PI * R;
  // Fill proportion is cosmetic — caps visual sweep at 100% APR.
  const frac = Math.max(0.04, Math.min(1, aprPct / 100));
  return (
    <svg width={64} height={64} viewBox="0 0 64 64">
      <circle cx={32} cy={32} r={R} fill="none" stroke="rgba(255, 255, 255, 0.1)" strokeWidth={7} />
      <circle
        cx={32}
        cy={32}
        r={R}
        fill="none"
        stroke="#7c5cff"
        strokeWidth={7}
        strokeLinecap="round"
        strokeDasharray={`${C * frac} ${C}`}
        transform="rotate(-90 32 32)"
      />
    </svg>
  );
}
