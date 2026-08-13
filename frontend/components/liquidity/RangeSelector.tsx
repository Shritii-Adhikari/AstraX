"use client";

const RANGE_PRESETS = [
  { label: "±5%", pct: 0.05 },
  { label: "±10%", pct: 0.10 },
  { label: "±20%", pct: 0.20 },
  { label: "±50%", pct: 0.50 },
  { label: "Full", pct: null },
] as const;

import { TICK_SPACING, MIN_TICK_USABLE, MAX_TICK_USABLE } from "@/lib/math";
import { priceToTick, roundTick, tickToPrice, clampTick, applyPreset } from "@/lib/math";

interface Props {
  currentPrice: number;        // pool.currentPrice in XLM/USDC (internal unit)
  tickLower: number;
  tickUpper: number;
  onTickLowerChange: (t: number) => void;
  onTickUpperChange: (t: number) => void;
}

// Pool: price = XLM/USDC.  UI convention: display everything as USDC/XLM (= 1/price).
// tickLower → lower XLM/USDC price → HIGHER USDC/XLM price → "Max Price" in the UI
// tickUpper → higher XLM/USDC price → LOWER  USDC/XLM price → "Min Price" in the UI

export default function RangeSelector({
  currentPrice,
  tickLower,
  tickUpper,
  onTickLowerChange,
  onTickUpperChange,
}: Props) {
  const priceXlmLower = tickToPrice(tickLower);   // XLM/USDC at tickLower
  const priceXlmUpper = tickToPrice(tickUpper);   // XLM/USDC at tickUpper

  // USDC/XLM display values (what the user sees)
  const minUsdcPerXlm = 1 / priceXlmUpper;  // min USDC/XLM = inverted upper bound
  const maxUsdcPerXlm = 1 / priceXlmLower;  // max USDC/XLM = inverted lower bound
  const currentUsdcPerXlm = 1 / currentPrice;

  // User edits "Min Price (USDC/XLM)" → affects tickUpper
  function handleMinPrice(raw: string) {
    const p = parseFloat(raw);
    if (isNaN(p) || p <= 0) return;
    const xlmPerUsdc = 1 / p;
    const t = clampTick(roundTick(priceToTick(xlmPerUsdc), TICK_SPACING));
    if (t > tickLower) onTickUpperChange(t);
  }

  // User edits "Max Price (USDC/XLM)" → affects tickLower
  function handleMaxPrice(raw: string) {
    const p = parseFloat(raw);
    if (isNaN(p) || p <= 0) return;
    const xlmPerUsdc = 1 / p;
    const t = clampTick(roundTick(priceToTick(xlmPerUsdc), TICK_SPACING));
    if (t < tickUpper) onTickLowerChange(t);
  }

  function handlePreset(pct: number | null) {
    const { tickLower: tl, tickUpper: tu } = applyPreset(currentPrice, pct, TICK_SPACING);
    onTickLowerChange(tl);
    onTickUpperChange(tu);
  }

  const isFullRange = tickLower === MIN_TICK_USABLE && tickUpper === MAX_TICK_USABLE;
  // Range width as % of price in USDC/XLM space
  const rangePct = isFullRange
    ? "Full Range"
    : `${((maxUsdcPerXlm / minUsdcPerXlm - 1) * 100).toFixed(1)}% width`;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      {/* Presets */}
      <div>
        <p style={{ color: "var(--text-secondary)", fontSize: "12px", marginBottom: "8px", fontWeight: 600 }}>
          RANGE PRESETS
        </p>
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
          {RANGE_PRESETS.map((preset) => {
            const { tickLower: tl, tickUpper: tu } = applyPreset(currentPrice, preset.pct, TICK_SPACING);
            const active = tl === tickLower && tu === tickUpper;
            return (
              <button
                key={preset.label}
                onClick={() => handlePreset(preset.pct)}
                style={{
                  padding: "8px 14px",
                  borderRadius: "8px",
                  border: "1px solid",
                  borderColor: active ? "rgba(255, 255, 255, 0.5)" : "rgba(255, 255, 255, 0.15)",
                  background: active ? "rgba(255, 255, 255, 0.2)" : "transparent",
                  color: active ? "var(--text-primary)" : "var(--text-secondary)",
                  cursor: "pointer",
                  fontWeight: 600,
                  fontSize: "13px",
                  transition: "all 0.15s",
                }}
              >
                {preset.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Manual price inputs (USDC per XLM) */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
        <PriceInput
          label="Min Price"
          sublabel="USDC per XLM"
          value={minUsdcPerXlm.toFixed(6)}
          onChange={handleMinPrice}
          warning={priceXlmUpper < currentPrice ? "Above current price" : undefined}
        />
        <PriceInput
          label="Max Price"
          sublabel="USDC per XLM"
          value={maxUsdcPerXlm.toFixed(6)}
          onChange={handleMaxPrice}
          warning={priceXlmLower > currentPrice ? "Below current price" : undefined}
        />
      </div>

      {/* Current price indicator */}
      <div
        style={{
          background: "rgba(255, 255, 255, 0.03)",
          border: "1px solid var(--border)",
          borderRadius: "10px",
          padding: "12px 16px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div>
          <p style={{ color: "var(--text-secondary)", fontSize: "11px" }}>CURRENT PRICE</p>
          <p style={{ color: "var(--text-primary)", fontWeight: 700, fontSize: "16px" }}>
            ${currentUsdcPerXlm.toFixed(4)}
          </p>
          <p style={{ color: "var(--text-secondary)", fontSize: "11px" }}>USDC per XLM</p>
        </div>
        <div style={{ textAlign: "right" }}>
          <p style={{ color: "var(--text-secondary)", fontSize: "11px" }}>RANGE WIDTH</p>
          <p style={{ color: "var(--text-primary)", fontWeight: 600, fontSize: "14px" }}>
            {rangePct}
          </p>
          {!isFullRange && (
            <p style={{ color: "var(--text-secondary)", fontSize: "11px" }}>
              Ticks: {tickLower} → {tickUpper}
            </p>
          )}
        </div>
      </div>

      {/* Tight range warning */}
      {!isFullRange && (maxUsdcPerXlm / minUsdcPerXlm - 1) < 0.02 && (
        <div
          style={{
            background: "rgba(234,179,8,0.08)",
            border: "1px solid rgba(234,179,8,0.2)",
            borderRadius: "10px",
            padding: "10px 14px",
            color: "#eab308",
            fontSize: "13px",
          }}
        >
          ⚠ Very tight range — higher fee income but significant impermanent loss risk if price moves
        </div>
      )}
    </div>
  );
}

function PriceInput({
  label,
  sublabel,
  value,
  onChange,
  warning,
}: {
  label: string;
  sublabel: string;
  value: string;
  onChange: (v: string) => void;
  warning?: string;
}) {
  return (
    <div
      style={{
        background: "rgba(255, 255, 255, 0.02)",
        border: `1px solid ${warning ? "rgba(234,179,8,0.3)" : "var(--border)"}`,
        borderRadius: "10px",
        padding: "12px 14px",
      }}
    >
      <p style={{ color: "var(--text-secondary)", fontSize: "11px", marginBottom: "8px" }}>
        {label}
      </p>
      <input
        type="number"
        step="0.0001"
        defaultValue={value}
        key={value}
        onBlur={(e) => onChange(e.target.value)}
        style={{
          width: "100%",
          background: "transparent",
          border: "none",
          outline: "none",
          color: "var(--text-primary)",
          fontSize: "16px",
          fontWeight: 700,
          fontFamily: "var(--font-jetbrains)",
        }}
      />
      <p style={{ color: "var(--text-secondary)", fontSize: "11px", marginTop: "4px" }}>
        {sublabel}
      </p>
      {warning && (
        <p style={{ color: "#eab308", fontSize: "11px", marginTop: "4px" }}>
          {warning}
        </p>
      )}
    </div>
  );
}
