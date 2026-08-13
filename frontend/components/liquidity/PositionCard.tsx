"use client";

import { Position } from "@/hooks/usePositions";
import { formatAmount, fromStroops } from "@/lib/math";
import { usePool } from "@/hooks/usePool";
import { usePrices } from "@/hooks/usePrices";
import { useWallet } from "@/hooks/useWallet";
import { buildCollectTx, buildDecreaseLiquidityTx } from "@/lib/transactions";
import { submitTransaction } from "@/lib/stellar";
import { useToast } from "@/components/Toast";
import { useState } from "react";
import { useTxTracker } from "@/context/TxTrackerContext";
import { useQueryClient } from "@tanstack/react-query";

interface Props {
  position: Position;
  onRefresh: () => void;
}

export default function PositionCard({ position, onRefresh }: Props) {
  const { data: pool } = usePool();
  const { xlmUsd, usdcUsd } = usePrices();
  const { address, sign } = useWallet();
  const { addToast } = useToast();
  const { trackTx } = useTxTracker();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState<"collect" | "remove" | null>(null);

  // Pool: token_0 = USDC, token_1 = XLM
  const usdcValue = formatAmount(position.amount0, 7, 4);
  const xlmValue  = formatAmount(position.amount1, 7, 4);
  const feeUsdc   = formatAmount(position.tokensOwed0, 7, 4);
  const feeXlm    = formatAmount(position.tokensOwed1, 7, 4);

  const usdTotal = xlmUsd > 0
    ? parseFloat(fromStroops(position.amount0)) * usdcUsd +
      parseFloat(fromStroops(position.amount1)) * xlmUsd
    : 0;

  const hasOwedTokens = position.tokensOwed0 > 0n || position.tokensOwed1 > 0n;
  const isPositionClosed = position.liquidity === 0n;

  function refreshAll() {
    onRefresh();
    queryClient.invalidateQueries({ queryKey: ["balances"] });
    queryClient.invalidateQueries({ queryKey: ["pool"] });
  }

  async function handleCollect() {
    if (!address || !sign) return;
    setLoading("collect");
    try {
      await trackTx(`Collect Fees for Position #${position.id.toString()}`, async (updateStep) => {
        updateStep("preparing");
        const xdr = await buildCollectTx(address, position.id, address);
        updateStep("waiting_signature");
        const signed = await sign(xdr);
        updateStep("submitting");
        updateStep("pending");
        const response = await submitTransaction(signed);
        return {
          hash: response.hash,
          ledger: response.ledger,
        };
      });
      addToast("Fees collected successfully!", "success");
      refreshAll();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("Collect fees submission error:", err);
      addToast(`Failed to collect fees: ${msg}`, "error");
    } finally {
      setLoading(null);
    }
  }

  async function handleRemove() {
    if (!address || !sign) return;
    setLoading("remove");
    try {
      const deadline = BigInt(Math.floor(Date.now() / 1000) + 300);
      await trackTx(`Remove Liquidity – Position #${position.id.toString()}`, async (updateStep) => {
        updateStep("preparing");
        const xdr = await buildDecreaseLiquidityTx(
          address,
          position.id,
          position.liquidity,
          0n,
          0n,
          deadline
        );
        updateStep("waiting_signature");
        const signed = await sign(xdr);
        updateStep("submitting");
        updateStep("pending");
        const response = await submitTransaction(signed);
        return {
          hash: response.hash,
          ledger: response.ledger,
        };
      });

      await trackTx(`Collect Tokens – Position #${position.id.toString()}`, async (updateStep) => {
        updateStep("preparing");
        const xdr = await buildCollectTx(address, position.id, address);
        updateStep("waiting_signature");
        const signed = await sign(xdr);
        updateStep("submitting");
        updateStep("pending");
        const response = await submitTransaction(signed);
        return {
          hash: response.hash,
          ledger: response.ledger,
        };
      });

      addToast("Position closed! Tokens returned to your wallet.", "success");
      refreshAll();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("Remove liquidity error:", err);
      addToast(`Failed to remove liquidity: ${msg}`, "error");
      refreshAll();
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="p-5 sm:p-6 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-white/20 transition-all flex flex-col gap-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-white/[0.06] border border-white/10 rounded-xl px-3 py-1.5">
            <img src="/xlm.svg" alt="XLM" className="w-5 h-5 rounded-full object-contain" />
            <span className="text-white/40 text-xs">/</span>
            <img src="/usdc.svg" alt="USDC" className="w-5 h-5 rounded-full object-contain" />
          </div>
          <div>
            <p className="text-white font-bold text-base">XLM / USDC</p>
            <p className="text-white/40 text-xs">Position #{position.id.toString()}</p>
          </div>
        </div>
        <span
          className={`px-3 py-1 rounded-full text-xs font-semibold ${
            isPositionClosed
              ? "bg-red-500/10 border border-red-500/20 text-red-400"
              : position.inRange
              ? "bg-green-500/10 border border-green-500/20 text-green-400"
              : "bg-yellow-500/10 border border-yellow-500/20 text-yellow-400"
          }`}
        >
          {isPositionClosed
            ? "Closed"
            : position.inRange
            ? "✓ In Range"
            : "⚠ Out of Range"}
        </span>
      </div>

      {/* Price range */}
      <div className="bg-white/[0.02] border border-white/10 rounded-xl p-3 sm:p-4">
        <p className="text-white/40 text-[11px] font-semibold uppercase tracking-wider mb-2">
          Price Range (USDC per XLM)
        </p>
        <div className="flex items-center justify-between text-sm">
          <div>
            <p className="text-white/40 text-xs">Min</p>
            <p className="text-white font-semibold">${(1 / position.priceUpper).toFixed(4)}</p>
          </div>
          <div className="text-white/30">→</div>
          <div className="text-right">
            <p className="text-white/40 text-xs">Max</p>
            <p className="text-white font-semibold">${(1 / position.priceLower).toFixed(4)}</p>
          </div>
        </div>
        {pool && (
          <div className="mt-2 text-center text-xs text-white/60">
            Current: ${(1 / pool.currentPrice).toFixed(4)}
          </div>
        )}
      </div>

      {/* Token amounts */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <TokenAmount symbol="USDC" logo="/usdc.svg" amount={usdcValue} />
        <TokenAmount symbol="XLM"  logo="/xlm.svg" amount={xlmValue} />
      </div>

      {/* USD value */}
      {usdTotal > 0 && (
        <p className="text-white/50 text-xs sm:text-sm text-center">
          Total Value ≈{" "}
          <span className="text-white font-semibold">${usdTotal.toFixed(2)}</span>
        </p>
      )}

      {/* Owed tokens / Fees section */}
      {hasOwedTokens && (
        <div className="bg-green-500/5 border border-green-500/20 rounded-xl p-3 sm:p-4">
          <p className="text-green-400 text-xs font-semibold uppercase tracking-wider mb-2">
            {isPositionClosed ? "Tokens to Collect" : "Uncollected Fees"}
          </p>
          <div className="flex justify-between text-sm text-white/80 font-medium">
            <span>{feeUsdc} USDC</span>
            <span>{feeXlm} XLM</span>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-2.5">
        <button
          onClick={handleCollect}
          disabled={loading !== null || !hasOwedTokens}
          className="flex-1 py-2.5 px-4 rounded-xl border border-green-500/30 bg-green-500/10 text-green-400 font-semibold text-sm hover:bg-green-500/20 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        >
          {loading === "collect"
            ? "Collecting..."
            : isPositionClosed
            ? "Collect Tokens"
            : "Collect Fees"}
        </button>
        {!isPositionClosed && (
          <button
            onClick={handleRemove}
            disabled={loading !== null}
            className="flex-1 py-2.5 px-4 rounded-xl border border-red-500/30 bg-red-500/10 text-red-400 font-semibold text-sm hover:bg-red-500/20 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            {loading === "remove" ? "Removing..." : "Remove Liquidity"}
          </button>
        )}
      </div>
    </div>
  );
}

function TokenAmount({
  symbol,
  logo,
  amount,
}: {
  symbol: string;
  logo: string;
  amount: string;
}) {
  return (
    <div className="bg-white/[0.02] border border-white/10 rounded-xl p-3">
      <div className="flex items-center gap-1.5 mb-1">
        <img src={logo} alt={symbol} className="w-4 h-4 rounded-full object-contain" />
        <span className="text-white/50 text-xs font-medium">{symbol}</span>
      </div>
      <p className="text-white font-semibold text-base">{amount}</p>
    </div>
  );
}
