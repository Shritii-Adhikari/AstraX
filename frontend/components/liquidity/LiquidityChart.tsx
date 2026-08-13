"use client";

import { useRef, useState, useMemo, useCallback } from "react";

interface Props {
  // All prices in USDC per XLM (the unit the user sees on screen).
  currentPrice: number;
  priceLower: number; // left handle  (min USDC/XLM)
  priceUpper: number; // right handle (max USDC/XLM)
  low24h: number | null;
  high24h: number | null;
  onPriceLowerChange: (p: number) => void;
  onPriceUpperChange: (p: number) => void;
  disabled?: boolean;
}

const W = 760;
const H = 300;
const PAD_X = 8;
const PAD_BOTTOM = 28;
const PAD_TOP = 12;

// Illustrative liquidity-depth curve. Real per-tick liquidity isn't indexed on
// testnet, so we render a smooth distribution centered on the current price to
// visualize concentration — the price lines, range shading and 24h band are all real.
function depthAt(price: number, center: number): number {
  const sigma = center * 0.16;
  const z = (price - center) / sigma;
  const main = Math.exp(-0.5 * z * z);
  // gentle right skew + baseline so it reads like an order-book depth chart
  const skew = 0.35 * Math.exp(-0.5 * Math.pow((price - center * 1.08) / (sigma * 1.6), 2));
  return main + skew + 0.04;
}

export default function LiquidityChart({
  currentPrice,
  priceLower,
  priceUpper,
  low24h,
  high24h,
  onPriceLowerChange,
  onPriceUpperChange,
  disabled = false,
}: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [zoom, setZoom] = useState(1); // 1 = default; <1 zooms in, >1 zooms out
  const dragging = useRef<"lower" | "upper" | null>(null);

  // Domain spans a symmetric window around current price, widened to always
  // contain both handles and the 24h band.
  const domain = useMemo(() => {
    const baseHalf = currentPrice * 0.5 * zoom;
    let lo = currentPrice - baseHalf;
    let hi = currentPrice + baseHalf;
    const mustInclude = [priceLower, priceUpper, low24h, high24h].filter(
      (v): v is number => typeof v === "number" && v > 0
    );
    for (const v of mustInclude) {
      lo = Math.min(lo, v);
      hi = Math.max(hi, v);
    }
    // 8% padding on each side
    const pad = (hi - lo) * 0.08;
    return { lo: Math.max(0, lo - pad), hi: hi + pad };
  }, [currentPrice, priceLower, priceUpper, low24h, high24h, zoom]);

  const plotW = W - PAD_X * 2;
  const plotH = H - PAD_BOTTOM - PAD_TOP;

  const priceToX = useCallback(
    (p: number) => PAD_X + ((p - domain.lo) / (domain.hi - domain.lo)) * plotW,
    [domain, plotW]
  );
  const xToPrice = useCallback(
    (x: number) => domain.lo + ((x - PAD_X) / plotW) * (domain.hi - domain.lo),
    [domain, plotW]
  );

  // Histogram bars
  const bars = useMemo(() => {
    const N = 64;
    const out: { x: number; h: number; price: number }[] = [];
    let max = 0;
    const raw: number[] = [];
    for (let i = 0; i < N; i++) {
      const p = domain.lo + ((i + 0.5) / N) * (domain.hi - domain.lo);
      const d = depthAt(p, currentPrice);
      raw.push(d);
      if (d > max) max = d;
    }
    for (let i = 0; i < N; i++) {
      const p = domain.lo + ((i + 0.5) / N) * (domain.hi - domain.lo);
      out.push({ x: PAD_X + (i / N) * plotW, h: (raw[i] / max) * plotH, price: p });
    }
    return { out, barW: plotW / N };
  }, [domain, currentPrice, plotW, plotH]);

  const xLower = priceToX(priceLower);
  const xUpper = priceToX(priceUpper);
  const xCurrent = priceToX(currentPrice);

  const handlePointer = useCallback(
    (e: React.PointerEvent) => {
      if (!dragging.current || !svgRef.current || disabled) return;
      const rect = svgRef.current.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * W;
      const p = xToPrice(x);
      if (p <= 0) return;
      if (dragging.current === "lower") {
        if (p < priceUpper) onPriceLowerChange(p);
      } else {
        if (p > priceLower) onPriceUpperChange(p);
      }
    },
    [xToPrice, priceLower, priceUpper, onPriceLowerChange, onPriceUpperChange, disabled]
  );

  const endDrag = () => {
    dragging.current = null;
  };

  const fmt = (p: number) =>
    p >= 100 ? p.toFixed(1) : p >= 1 ? p.toFixed(3) : p.toFixed(5);

  // X axis ticks
  const axisTicks = useMemo(() => {
    const ticks: number[] = [];
    const span = domain.hi - domain.lo;
    const step = niceStep(span / 6);
    const start = Math.ceil(domain.lo / step) * step;
    for (let v = start; v <= domain.hi; v += step) ticks.push(v);
    return ticks;
  }, [domain]);

  return (
    <div style={{ position: "relative", width: "100%" }}>
      {/* Zoom controls */}
      <div
        style={{
          position: "absolute",
          top: 8,
          right: 10,
          display: "flex",
          gap: 6,
          zIndex: 2,
        }}
      >
        <ZoomBtn label="⟲" onClick={() => setZoom(1)} title="Reset zoom" />
        <ZoomBtn label="+" onClick={() => setZoom((z) => Math.max(0.25, z * 0.8))} title="Zoom in" />
        <ZoomBtn label="−" onClick={() => setZoom((z) => Math.min(4, z * 1.25))} title="Zoom out" />
      </div>

      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        style={{ width: "100%", height: "auto", touchAction: "none", userSelect: "none" }}
        onPointerMove={handlePointer}
        onPointerUp={endDrag}
        onPointerLeave={endDrag}
      >
        <defs>
          <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(255, 255, 255, 0.15)" stopOpacity="0.22" />
            <stop offset="100%" stopColor="rgba(255, 255, 255, 0.15)" stopOpacity="0.05" />
          </linearGradient>
          <linearGradient id="barGradActive" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#7c5cff" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#7c5cff" stopOpacity="0.3" />
          </linearGradient>
        </defs>

        {/* 24h range band */}
        {low24h && high24h && (
          <rect
            x={priceToX(low24h)}
            y={PAD_TOP}
            width={Math.max(0, priceToX(high24h) - priceToX(low24h))}
            height={plotH}
            fill="rgba(255, 255, 255, 0.03)"
          />
        )}

        {/* Selected range shading */}
        <rect
          x={Math.min(xLower, xUpper)}
          y={PAD_TOP}
          width={Math.abs(xUpper - xLower)}
          height={plotH}
          fill="rgba(124, 92, 255, 0.08)"
        />

        {/* Histogram */}
        {bars.out.map((b, i) => {
          const inRange = b.price >= priceLower && b.price <= priceUpper;
          return (
            <rect
              key={i}
              x={b.x}
              y={PAD_TOP + plotH - b.h}
              width={Math.max(1, bars.barW - 1)}
              height={b.h}
              fill={inRange ? "url(#barGradActive)" : "url(#barGrad)"}
              rx={1}
            />
          );
        })}

        {/* Current price line */}
        <line
          x1={xCurrent}
          y1={PAD_TOP}
          x2={xCurrent}
          y2={PAD_TOP + plotH}
          stroke="#ffffff"
          strokeWidth={1.5}
          strokeDasharray="4 3"
        />

        {/* Range handles */}
        <Handle x={xLower} h={plotH} color="#7c5cff" onDown={() => (dragging.current = "lower")} disabled={disabled} />
        <Handle x={xUpper} h={plotH} color="#7c5cff" onDown={() => (dragging.current = "upper")} disabled={disabled} />

        {/* X axis labels */}
        {axisTicks.map((t, i) => (
          <text
            key={i}
            x={priceToX(t)}
            y={H - 8}
            fontSize={11}
            fill="var(--text-secondary)"
            textAnchor="middle"
          >
            {fmt(t)}
          </text>
        ))}
      </svg>

      {/* Legend / readouts */}
      <div
        style={{
          display: "flex",
          gap: 20,
          flexWrap: "wrap",
          marginTop: 8,
          fontSize: 12,
          color: "var(--text-secondary)",
        }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ width: 14, height: 0, borderTop: "1.5px dashed #ffffff" }} />
          Current Price&nbsp;
          <strong style={{ color: "#ffffff" }}>{fmt(currentPrice)}</strong>&nbsp;USDC per XLM
        </span>
        {low24h && high24h && (
          <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 12, height: 12, background: "rgba(255, 255, 255, 0.15)", borderRadius: 2 }} />
            24h Range&nbsp;
            <strong style={{ color: "#ffffff" }}>
              {fmt(low24h)} – {fmt(high24h)}
            </strong>
          </span>
        )}
      </div>
    </div>
  );
}

interface HandleProps {
  x: number;
  h: number;
  color: string;
  onDown: () => void;
  disabled: boolean;
}

function Handle({
  x,
  h,
  color,
  onDown,
  disabled,
}: HandleProps) {
  return (
    <g
      style={{ cursor: disabled ? "default" : "ew-resize" }}
      onPointerDown={(e) => {
        if (disabled) return;
        (e.target as Element).setPointerCapture?.(e.pointerId);
        onDown();
      }}
    >
      <line x1={x} y1={PAD_TOP} x2={x} y2={PAD_TOP + h} stroke={color} strokeWidth={2} />
      {/* fat invisible hit area */}
      <rect x={x - 8} y={PAD_TOP} width={16} height={h} fill="transparent" />
      <rect x={x - 4} y={PAD_TOP - 2} width={8} height={14} rx={2} fill={color} />
      <rect x={x - 4} y={PAD_TOP + h - 12} width={8} height={14} rx={2} fill={color} />
    </g>
  );
}

function ZoomBtn({ label, onClick, title }: { label: string; onClick: () => void; title: string }) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        width: 28,
        height: 28,
        borderRadius: 8,
        border: "1px solid var(--border)",
        background: "rgba(255, 255, 255, 0.05)",
        color: "var(--text-primary)",
        cursor: "pointer",
        fontSize: 14,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {label}
    </button>
  );
}

function niceStep(raw: number): number {
  const pow = Math.pow(10, Math.floor(Math.log10(raw)));
  const n = raw / pow;
  if (n < 1.5) return pow;
  if (n < 3) return 2 * pow;
  if (n < 7) return 5 * pow;
  return 10 * pow;
}
