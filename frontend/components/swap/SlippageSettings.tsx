"use client";

import { useState } from "react";
const SLIPPAGE_PRESETS = [0.1, 0.5, 1.0] as const;

interface Props {
  slippage: number;
  onChange: (v: number) => void;
  trigger?: React.ReactNode;
}

export default function SlippageSettings({ slippage, onChange, trigger }: Props) {
  const [open, setOpen] = useState(false);
  const [custom, setCustom] = useState("");

  return (
    <div style={{ position: "relative" }}>
      <div onClick={() => setOpen((o) => !o)}>
        {trigger ?? (
          <button
            style={{
              background: "rgba(255, 255, 255, 0.05)",
              border: "1px solid rgba(255, 255, 255, 0.12)",
              borderRadius: "8px",
              color: "var(--text-secondary)",
              padding: "6px 12px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              fontSize: "13px",
            }}
            title="Slippage settings"
          >
            <span>⚙</span>
            <span style={{ color: "var(--text-primary)" }}>{slippage}%</span>
          </button>
        )}
      </div>

      {open && (
        <div
          className="slippage-panel"
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border)",
            borderRadius: "12px",
            padding: "16px",
            width: "240px",
            maxWidth: "calc(100vw - 32px)",
            boxShadow: "0 8px 24px rgba(0, 0, 0, 0.4)",
            zIndex: 100,
          }}
        >
          <p
            style={{
              color: "var(--text-secondary)",
              fontSize: "12px",
              marginBottom: "10px",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            Slippage Tolerance
          </p>
          <div style={{ display: "flex", gap: "6px", marginBottom: "10px" }}>
            {SLIPPAGE_PRESETS.map((p) => (
              <button
                key={p}
                onClick={() => {
                  onChange(p);
                  setCustom("");
                }}
                style={{
                  flex: 1,
                  padding: "8px 0",
                  borderRadius: "8px",
                  border: "1px solid",
                  borderColor:
                    slippage === p
                      ? "rgba(255, 255, 255, 0.6)"
                      : "rgba(255, 255, 255, 0.15)",
                  background:
                    slippage === p
                      ? "rgba(255, 255, 255, 0.2)"
                      : "transparent",
                  color: slippage === p ? "var(--text-primary)" : "var(--text-secondary)",
                  cursor: "pointer",
                  fontSize: "13px",
                  fontWeight: 600,
                }}
              >
                {p}%
              </button>
            ))}
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              background: "var(--bg-input)",
              border: "1px solid rgba(255, 255, 255, 0.15)",
              borderRadius: "8px",
              padding: "8px 12px",
              gap: "6px",
            }}
          >
            <input
              type="number"
              placeholder="Custom"
              value={custom}
              onChange={(e) => {
                setCustom(e.target.value);
                const v = parseFloat(e.target.value);
                if (!isNaN(v) && v > 0 && v <= 50) onChange(v);
              }}
              style={{
                flex: 1,
                background: "transparent",
                border: "none",
                outline: "none",
                color: "var(--text-primary)",
                fontSize: "13px",
              }}
            />
            <span style={{ color: "var(--text-secondary)", fontSize: "13px" }}>%</span>
          </div>
          {slippage > 1 && (
            <p style={{ color: "#eab308", fontSize: "11px", marginTop: "8px" }}>
              ⚠ High slippage — you may receive a bad rate
            </p>
          )}
        </div>
      )}
    </div>
  );
}
