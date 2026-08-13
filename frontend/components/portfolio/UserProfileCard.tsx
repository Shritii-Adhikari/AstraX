"use client";

import React, { useState } from "react";
import { useProfile } from "@/hooks/useProfile";
import { useWallet } from "@/hooks/useWallet";
import { Loader2, User, Save, CheckCircle2, Globe } from "lucide-react";
import { PROFILE_CONTRACT_ADDRESS } from "@/lib/stellar/contracts";

export default function UserProfileCard() {
  const { address } = useWallet();
  const { nickname, isLoading, isRefetching, updateProfile, isUpdating } = useProfile(address);
  const [inputName, setInputName] = useState("");

  const [prevNickname, setPrevNickname] = useState<string | null>(null);

  if (nickname !== prevNickname) {
    setPrevNickname(nickname);
    setInputName(nickname);
  }

  if (!address) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputName.trim() || inputName === nickname) return;
    try {
      await updateProfile(inputName.trim());
    } catch (err) {
      console.error("Failed to update on-chain profile:", err);
    }
  };

  const hasChanged = inputName.trim() !== (nickname || "");
  const canSave = hasChanged && !isUpdating && inputName.trim().length > 0;

  return (
    <div
      className="glass-card animate-fade-in"
      style={{
        padding: 24,
        marginBottom: 32,
        background: "rgba(255,255,255,0.02)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: "24px",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: "#ffffff", display: "flex", alignItems: "center", gap: 8 }}>
            <User className="w-5 h-5 text-[#3D81E3]" />
            On-Chain Profile Metadata
          </h2>
          <p style={{ color: "rgba(255, 255, 255, 0.4)", fontSize: 13, marginTop: 4 }}>
            Read & write profile nickname stored in our deployed Soroban contract on Testnet
          </p>
        </div>
        <div
          style={{
            fontSize: 10,
            padding: "4px 10px",
            borderRadius: 12,
            border: "1px solid rgba(164, 244, 253, 0.2)",
            background: "rgba(164, 244, 253, 0.05)",
            color: "#A4F4FD",
            fontWeight: 600,
            display: "flex",
            alignItems: "center",
            gap: 4,
          }}
        >
          <Globe className="w-3 h-3" />
          Testnet
        </div>
      </div>

      {/* Contract Details */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "10px 14px",
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.05)",
          borderRadius: "14px",
          marginBottom: 20,
        }}
      >
        <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 11, fontWeight: 600 }}>Contract ID:</span>
        <span
          style={{
            fontFamily: "var(--font-jetbrains)",
            fontSize: 11,
            color: "rgba(255,255,255,0.8)",
            wordBreak: "break-all",
          }}
        >
          {PROFILE_CONTRACT_ADDRESS}
        </span>
      </div>

      {/* Profile Form */}
      {isLoading ? (
        <div style={{ display: "flex", alignItems: "center", justifyItems: "center", gap: 10, paddingTop: 10, paddingBottom: 10 }}>
          <Loader2 className="w-5 h-5 animate-spin text-[#3D81E3]" />
          <span style={{ color: "rgba(255, 255, 255, 0.5)", fontSize: 13 }}>Loading on-chain profile...</span>
        </div>
      ) : (
        <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <span style={{ color: "rgba(255, 255, 255, 0.4)", fontSize: 12, fontWeight: 600 }}>
              On-Chain Nickname
            </span>
            <div style={{ position: "relative", marginTop: 6 }}>
              <input
                value={inputName}
                onChange={(e) => setInputName(e.target.value)}
                placeholder="Enter a profile nickname..."
                maxLength={30}
                spellCheck={false}
                style={{
                  width: "100%",
                  background: "rgba(255, 255, 255, 0.03)",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  borderRadius: 12,
                  padding: "12px 14px",
                  color: "#ffffff",
                  fontSize: 14,
                  fontFamily: "var(--font-instrument)",
                  outline: "none",
                }}
              />
              {nickname && !hasChanged && (
                <div
                  style={{
                    position: "absolute",
                    right: 14,
                    top: "50%",
                    transform: "translateY(-50%)",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    color: "#34d399",
                    fontSize: 12,
                  }}
                >
                  <CheckCircle2 className="w-4 h-4 fill-emerald-500/10" />
                  Saved
                </div>
              )}
            </div>
          </div>

          <button
            type="submit"
            className="btn-primary"
            disabled={!canSave || isUpdating}
            style={{
              padding: 14,
              fontSize: 14,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              marginTop: 6,
            }}
          >
            {isUpdating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-black" />
                Updating On-Chain...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save Nickname to Blockchain
              </>
            )}
          </button>
        </form>
      )}

      {/* Sync Indicators */}
      {isRefetching && !isLoading && (
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 12 }}>
          <Loader2 className="w-3.5 h-3.5 animate-spin text-white/40" />
          <span style={{ color: "rgba(255, 255, 255, 0.3)", fontSize: 11 }}>Synchronizing with ledger...</span>
        </div>
      )}
    </div>
  );
}
