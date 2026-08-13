"use client";

import React, { useState, useEffect } from "react";
import { POOL_ADDRESS } from "@/lib/stellar/contracts";
import { simulateContractRead } from "@/lib/stellar";
import { scValToNative } from "@stellar/stellar-sdk";
import { Loader2, CheckCircle2, AlertTriangle, Cpu } from "lucide-react";

export default function ContractStatus() {
  const [status, setStatus] = useState<"loading" | "active" | "error">("loading");
  const [slot0, setSlot0] = useState<{ sqrtPriceX64: string; tick: number } | null>(null);

  useEffect(() => {
    let active = true;
    const checkStatus = async () => {
      try {
        const result = await simulateContractRead(POOL_ADDRESS, "slot0", []);
        if (result) {
          const native = scValToNative(result) as { sqrt_price_x64: string; tick: number };
          if (active) {
            setSlot0({
              sqrtPriceX64: String(native.sqrt_price_x64),
              tick: Number(native.tick)
            });
            setStatus("active");
          }
        } else {
          if (active) setStatus("error");
        }
      } catch (err) {
        if (active) setStatus("error");
      }
    };

    checkStatus();
    const interval = setInterval(checkStatus, 15000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 mb-6 backdrop-blur-md">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Cpu className="w-5 h-5 text-[#3D81E3]" />
          <div>
            <h4 className="text-[10px] text-white/40 font-bold uppercase tracking-wider">Stellar Soroban Contract</h4>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-xs font-semibold font-mono text-white/80">
                Pool: {POOL_ADDRESS ? `${POOL_ADDRESS.slice(0, 6)}...${POOL_ADDRESS.slice(-6)}` : "Not Configured"}
              </span>
            </div>
          </div>
        </div>

        <div>
          {status === "loading" && (
            <span className="inline-flex items-center gap-1.5 text-xs text-white/40">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Connecting...
            </span>
          )}
          {status === "active" && (
            <span className="inline-flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5 fill-emerald-500/10" />
              Connected (Tick: {slot0?.tick})
            </span>
          )}
          {status === "error" && (
            <span className="inline-flex items-center gap-1.5 text-xs text-amber-400 font-medium">
              <AlertTriangle className="w-3.5 h-3.5" />
              Not Configured / Offline
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
