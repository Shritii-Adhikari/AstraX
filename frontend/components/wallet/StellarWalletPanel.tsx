"use client";

import { useState } from "react";
import { useStellarWallet } from "@/hooks/use-stellar-wallet";

const EXPLORER_TX = "https://stellar.expert/explorer/testnet/tx";

export default function StellarWalletPanel() {
  const {
    address,
    balance,
    isConnected,
    isLoading,
    error,
    hasFreighter,
    connect,
    disconnect,
    refreshBalance,
    sendXlm,
  } = useStellarWallet();

  const [to, setTo] = useState("");
  const [amount, setAmount] = useState("");
  const [sending, setSending] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    setTxHash(null);
    setSendError(null);
    setSending(true);
    try {
      const { hash } = await sendXlm(to.trim(), amount.trim());
      setTxHash(hash);
      setTo("");
      setAmount("");
    } catch (err) {
      setSendError(err instanceof Error ? err.message : String(err));
    } finally {
      setSending(false);
    }
  }

  const canSend =
    isConnected &&
    !sending &&
    to.trim().length > 0 &&
    Number(amount) > 0;

  return (
    <div className="glass-card animate-fade-in" style={{ padding: 24, marginBottom: 32, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "24px" }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: "#ffffff" }}>
          Stellar Wallet — Freighter Integration
        </h2>
        <p style={{ color: "rgba(255, 255, 255, 0.4)", fontSize: 13, marginTop: 4 }}>
          Detect · Connect · Balance · Send XLM on Stellar Testnet
        </p>
      </div>

      {/* Not installed */}
      {hasFreighter === false && (
        <div style={banner("#fbbf24")}>
          Freighter extension not detected.{" "}
          <a
            href="https://freighter.app"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "#fbbf24", fontWeight: 600, textDecoration: "underline" }}
          >
            Install Freighter →
          </a>
        </div>
      )}

      {/* Not connected */}
      {!isConnected ? (
        <button
          className="btn-primary"
          onClick={() => connect()}
          disabled={isLoading}
          style={{ padding: "12px 24px", fontSize: 15 }}
        >
          {isLoading ? "Connecting…" : "Connect Wallet"}
        </button>
      ) : (
        <>
          {/* Address + balance */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 16, marginBottom: 18 }}>
            <div style={{ flex: "1 1 280px", minWidth: 0 }}>
              <Label>Connected Address</Label>
              <p
                style={{
                  color: "rgba(255, 255, 255, 0.85)",
                  fontFamily: "var(--font-jetbrains)",
                  fontSize: 13,
                  wordBreak: "break-all",
                  marginTop: 6,
                  padding: "10px 14px",
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  borderRadius: "12px",
                }}
              >
                {address}
              </p>
            </div>
            <div style={{ flex: "1 1 160px" }}>
              <Label>XLM Balance</Label>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
                <img src="/xlm.svg" alt="XLM" style={{ width: 24, height: 24, borderRadius: "50%", objectFit: "contain" }} />
                <p style={{ color: "#ffffff", fontSize: 24, fontWeight: 800 }}>
                  {balance !== null ? `${parseFloat(balance).toLocaleString(undefined, { maximumFractionDigits: 4 })}` : "—"}{" "}
                  <span style={{ fontSize: 14, color: "rgba(255, 255, 255, 0.4)", fontWeight: 600 }}>
                    XLM
                  </span>
                </p>
              </div>
              {balance === "0" && (
                <p style={{ color: "#fbbf24", fontSize: 11, marginTop: 4 }}>
                  Account not funded
                </p>
              )}
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, marginBottom: 24 }}>
            <button onClick={refreshBalance} disabled={isLoading} style={secondaryBtn}>
              {isLoading ? "Refreshing…" : "Refresh Balance"}
            </button>
            <button onClick={disconnect} style={dangerBtn}>
              Disconnect
            </button>
          </div>

          {/* Send form */}
          <form onSubmit={handleSend} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <Label>Destination Address</Label>
              <input
                value={to}
                onChange={(e) => setTo(e.target.value)}
                placeholder="G…"
                spellCheck={false}
                style={inputStyle}
              />
            </div>
            <div>
              <Label>Amount (XLM)</Label>
              <input
                type="number"
                min="0"
                step="any"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.0"
                style={inputStyle}
              />
            </div>
            <button
              type="submit"
              className="btn-primary"
              disabled={!canSend}
              style={{ padding: 14, fontSize: 15 }}
            >
              {sending ? "Sending…" : "Send XLM"}
            </button>
          </form>
        </>
      )}

      {/* Success banner */}
      {txHash && (
        <div style={banner("#34d399")}>
          ✓ Transaction sent! Hash:{" "}
          <a
            href={`${EXPLORER_TX}/${txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "#34d399", fontFamily: "var(--font-jetbrains)", wordBreak: "break-all", textDecoration: "underline" }}
          >
            {txHash}
          </a>
        </div>
      )}

      {/* Error banners (send-specific, then hook-level) */}
      {sendError && <div style={banner("#f87171")}>{sendError}</div>}
      {!sendError && error && <div style={banner("#f87171")}>{error}</div>}
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <span style={{ color: "rgba(255, 255, 255, 0.4)", fontSize: 12, fontWeight: 600 }}>{children}</span>
  );
}

function banner(color: string): React.CSSProperties {
  return {
    marginTop: 16,
    padding: "12px 16px",
    borderRadius: 12,
    border: `1px solid ${color}33`,
    background: `${color}0c`,
    color,
    fontSize: 13,
    lineHeight: 1.5,
  };
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  marginTop: 6,
  background: "rgba(255, 255, 255, 0.03)",
  border: "1px solid rgba(255, 255, 255, 0.08)",
  borderRadius: 12,
  padding: "12px 14px",
  color: "#ffffff",
  fontSize: 14,
  fontFamily: "var(--font-jetbrains)",
  outline: "none",
};

const secondaryBtn: React.CSSProperties = {
  padding: "10px 18px",
  borderRadius: 12,
  border: "1px solid rgba(255, 255, 255, 0.1)",
  background: "rgba(255, 255, 255, 0.04)",
  color: "#ffffff",
  cursor: "pointer",
  fontWeight: 600,
  fontSize: 13,
  transition: "all 0.15s ease",
};

const dangerBtn: React.CSSProperties = {
  padding: "10px 18px",
  borderRadius: 12,
  border: "1px solid rgba(244, 63, 94, 0.2)",
  background: "rgba(244, 63, 94, 0.05)",
  color: "#fb7185",
  cursor: "pointer",
  fontWeight: 600,
  fontSize: 13,
  transition: "all 0.15s ease",
};
