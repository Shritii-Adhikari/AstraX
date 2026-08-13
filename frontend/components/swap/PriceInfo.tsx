"use client";

import { useState, useEffect } from "react";

interface Props {
  rate: string;
  priceImpact: number;
  minimumReceived: string;
  fee: string;
  slippage: number;
  isThinPool?: boolean;
  lastFetchedAt?: number;      // from usePool, for staleness dot
  onHighImpactAcknowledged?: (v: boolean) => void;
}

export default function PriceInfo({
  rate,
  priceImpact,
  minimumReceived,
  fee,
  slippage,
  isThinPool = false,
  lastFetchedAt,
  onHighImpactAcknowledged,
}: Props) {
  // Gap 4: staleness counter — ticks every second
  const [secondsAgo, setSecondsAgo] = useState(0);
  useEffect(() => {
    if (!lastFetchedAt) return;
    const update = () => setSecondsAgo(Math.floor((Date.now() - lastFetchedAt) / 1000));
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [lastFetchedAt]);

  const isStale = lastFetchedAt !== undefined && secondsAgo > 8;

  // Gap 2: price impact severity
  const impactPct = (priceImpact * 100).toFixed(3);
  const impactColor =
    priceImpact < 0.001 ? "#22c55e" :
    priceImpact < 0.01  ? "#eab308" :
    priceImpact < 0.05  ? "#f97316" :
                          "#ef4444";
  const isVeryHigh = priceImpact >= 0.05;

  return (
    <div
      style={{
        background: "rgba(255, 255, 255, 0.02)",
        border: "1px solid var(--border)",
        borderRadius: "12px",
        padding: "14px 16px",
        display: "flex",
        flexDirection: "column",
        gap: "10px",
      }}
    >
      {/* Rate + staleness dot */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ color: "var(--text-secondary)", fontSize: "13px" }}>Rate</span>
        <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span style={{ color: "var(--text-primary)", fontSize: "13px", fontWeight: 600 }}>{rate}</span>
          {lastFetchedAt !== undefined && (
            <span
              title={`Price updated ${secondsAgo}s ago`}
              style={{
                display: "inline-block",
                width: "7px",
                height: "7px",
                borderRadius: "50%",
                background: isStale ? "#f59e0b" : "#22c55e",
                animation: isStale ? "pulse 1s infinite" : undefined,
                flexShrink: 0,
              }}
            />
          )}
        </span>
      </div>

      {isStale && (
        <p style={{ color: "#92400e", fontSize: "11px", textAlign: "right", marginTop: "-6px" }}>
          Refreshing... ({secondsAgo}s ago)
        </p>
      )}

      {/* Price impact */}
      <Row label="Price Impact" value={`${impactPct}%`} valueColor={impactColor} />

      {/* Gap 2: thin-pool context */}
      {isThinPool && (
        <p
          style={{
            fontSize: "11px",
            color: "#92400e",
            background: "rgba(251,191,36,0.08)",
            border: "1px solid rgba(251,191,36,0.2)",
            borderRadius: "6px",
            padding: "6px 10px",
            lineHeight: 1.4,
          }}
        >
          High impact due to low pool liquidity. Consider splitting into smaller swaps.
        </p>
      )}

      {/* Gap 2: very-high impact acknowledgment */}
      {isVeryHigh && (
        <div
          style={{
            background: "rgba(239,68,68,0.08)",
            border: "1px solid rgba(239,68,68,0.25)",
            borderRadius: "8px",
            padding: "10px 12px",
            display: "flex",
            flexDirection: "column",
            gap: "8px",
          }}
        >
          <p style={{ color: "#dc2626", fontSize: "12px", lineHeight: 1.4 }}>
            Price impact exceeds 5%. You will receive significantly less than the
            displayed amount. Proceed only if you understand the risk.
          </p>
          <label
            style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "12px", color: "var(--text-secondary)" }}
          >
            <input
              type="checkbox"
              onChange={(e) => onHighImpactAcknowledged?.(e.target.checked)}
              style={{ width: "14px", height: "14px", accentColor: "var(--text-primary)", cursor: "pointer" }}
            />
            I understand the price impact and want to continue
          </label>
        </div>
      )}

      <Row label="Minimum Received" value={minimumReceived} valueColor="var(--text-primary)" />
      <Row label="Slippage Tolerance" value={`${slippage}%`} valueColor="var(--text-secondary)" />
      <Row label="Fee (0.3%)" value={fee} valueColor="var(--text-secondary)" />
    </div>
  );
}

function Row({ label, value, valueColor }: { label: string; value: string; valueColor: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <span style={{ color: "var(--text-secondary)", fontSize: "13px" }}>{label}</span>
      <span style={{ color: valueColor, fontSize: "13px", fontWeight: 600 }}>{value}</span>
    </div>
  );
}
