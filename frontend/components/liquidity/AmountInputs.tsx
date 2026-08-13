"use client";

import { usePrices } from "@/hooks/usePrices";
import { toUsd, formatUsd } from "@/lib/math";

interface Props {
  amount0: string;
  amount1: string;
  onAmount0Change: (v: string) => void;
  onAmount1Change: (v: string) => void;
  price0Only: boolean;
  price1Only: boolean;
}

export default function AmountInputs({
  amount0,
  amount1,
  onAmount0Change,
  onAmount1Change,
  price0Only,
  price1Only,
}: Props) {
  const prices = usePrices();

  const xlmUsd = toUsd(parseFloat(amount0) || 0, "xlm", prices);
  const usdcUsd = toUsd(parseFloat(amount1) || 0, "usdc", prices);
  const totalUsd = xlmUsd + usdcUsd;

  return (
    <div className="flex flex-col gap-3">
      <p className="text-white/50 text-xs font-semibold tracking-wider uppercase">
        Deposit Amounts
      </p>

      {/* Out-of-range notice */}
      {(price0Only || price1Only) && (
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-3 text-xs text-yellow-400 leading-relaxed">
          {price1Only ? (
            <>
              <strong>Price is below your range.</strong> Your deposit will be
              100% XLM. You will earn fees when price rises back into your range.
            </>
          ) : (
            <>
              <strong>Price is above your range.</strong> Your deposit will be
              100% USDC. You will earn fees when price falls back into your range.
            </>
          )}
        </div>
      )}

      {/* Token 0 — XLM */}
      <div
        className={`p-4 rounded-xl bg-white/[0.03] border ${
          price0Only ? "border-white/5 opacity-50" : "border-white/10"
        } transition-all`}
      >
        <div className="flex justify-between items-center mb-2">
          <span className="text-white/50 text-xs font-medium">XLM Amount</span>
          {price0Only && (
            <span className="text-white/40 text-[11px]">
              Price above range — no XLM needed
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-white/[0.06] border border-white/10 rounded-lg px-3 py-1.5 shrink-0">
            <img src="/xlm.svg" alt="XLM" className="w-5 h-5 rounded-full object-contain" />
            <span className="text-white font-bold text-sm">XLM</span>
          </div>
          <input
            type="text"
            inputMode="decimal"
            placeholder="0.0"
            value={amount0}
            onChange={(e) => onAmount0Change(e.target.value)}
            disabled={price0Only}
            className="flex-1 bg-transparent border-none outline-none text-white text-xl font-semibold text-right font-jetbrains"
          />
        </div>
        {xlmUsd > 0 && !price0Only && (
          <p className="text-white/40 text-xs text-right mt-1">
            ≈ {formatUsd(xlmUsd)}
          </p>
        )}
      </div>

      {/* Token 1 — USDC */}
      <div
        className={`p-4 rounded-xl bg-white/[0.03] border ${
          price1Only ? "border-white/5 opacity-50" : "border-white/10"
        } transition-all`}
      >
        <div className="flex justify-between items-center mb-2">
          <span className="text-white/50 text-xs font-medium">USDC Amount</span>
          {price1Only && (
            <span className="text-white/40 text-[11px]">
              Price below range — no USDC needed
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-white/[0.06] border border-white/10 rounded-lg px-3 py-1.5 shrink-0">
            <img src="/usdc.svg" alt="USDC" className="w-5 h-5 rounded-full object-contain" />
            <span className="text-white font-bold text-sm">USDC</span>
          </div>
          <input
            type="text"
            inputMode="decimal"
            placeholder="0.0"
            value={amount1}
            onChange={(e) => onAmount1Change(e.target.value)}
            disabled={price1Only}
            className="flex-1 bg-transparent border-none outline-none text-white text-xl font-semibold text-right font-jetbrains"
          />
        </div>
        {usdcUsd > 0 && !price1Only && (
          <p className="text-white/40 text-xs text-right mt-1">
            ≈ {formatUsd(usdcUsd)}
          </p>
        )}
      </div>

      {/* Total deposit value */}
      {totalUsd > 0 && (
        <div className="flex justify-between text-xs text-white/50 px-1 pt-1">
          <span>Total Deposit Value</span>
          <span className="text-white font-semibold">{formatUsd(totalUsd)}</span>
        </div>
      )}
    </div>
  );
}
