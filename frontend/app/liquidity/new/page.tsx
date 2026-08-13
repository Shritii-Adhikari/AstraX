"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import LiquidityChart from "@/components/liquidity/LiquidityChart";
import Navbar from "@/components/Navbar";
import AprDonut from "@/components/liquidity/AprDonut";
import { usePool } from "@/hooks/usePool";
import { useWallet } from "@/hooks/useWallet";
import { useToast } from "@/components/Toast";
import { useTxTracker } from "@/context/TxTrackerContext";
import { useSpotPrices, useMarket24h } from "@/hooks/useMarketData";
import { useBalances } from "@/hooks/useBalances";
import { usePoolReserves } from "@/hooks/usePoolStats";
import {
  toStroops,
  fromStroops,
  getLiquidityForAmounts,
  getAmountsForLiquidity,
  priceToSqrtPriceX64,
  tickToPrice,
  roundTick,
  priceToTick,
  clampTick,
  applyPreset,
  formatUsd,
} from "@/lib/math";
import { buildMintTx, buildApprovalTx } from "@/lib/transactions";
import { submitTransaction, getLatestLedger, hasTrustline, buildTrustlineTx } from "@/lib/stellar";
import { useQueryClient } from "@tanstack/react-query";
import { POOL_ADDRESS } from "@/lib/stellar/contracts";
import { XLM_ADDRESS, USDC_ADDRESS, USDC_ISSUER, USDC_ASSET_CODE, STROOP } from "@/lib/stellar/assets";
import { TICK_SPACING } from "@/lib/math";

const PRESETS = [
  { label: "±1%", pct: 0.01 },
  { label: "±5%", pct: 0.05 },
  { label: "±10%", pct: 0.1 },
  { label: "±20%", pct: 0.2 },
  { label: "±50%", pct: 0.5 },
] as const;

const XLM_GAS_RESERVE = 2n * STROOP;

export default function AddLiquidityPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: pool } = usePool();
  const { address, connect, sign } = useWallet();
  const { addToast } = useToast();
  const { trackTx } = useTxTracker();
  const { data: spot } = useSpotPrices();
  const { data: market } = useMarket24h();
  const { data: balances } = useBalances(address);
  const { data: reserves } = usePoolReserves();

  const xlmUsd = spot?.xlmUsd ?? 0;
  const usdcUsd = spot?.usdcUsd ?? 1;

  const liveUsdcPerXlm = xlmUsd > 0 ? xlmUsd / usdcUsd : 0;
  const onChainXlmPerUsdc = pool && pool.tick !== undefined ? tickToPrice(pool.tick) : 0;
  const poolUsdcPerXlm = onChainXlmPerUsdc > 0 ? 1 / onChainXlmPerUsdc : 0;

  const currentUsdcPerXlm = liveUsdcPerXlm > 0 ? liveUsdcPerXlm : poolUsdcPerXlm;
  const currentXlmPerUsdc = currentUsdcPerXlm > 0 ? 1 / currentUsdcPerXlm : 0;
  const sqrtCurrent = currentXlmPerUsdc > 0 ? priceToSqrtPriceX64(currentXlmPerUsdc) : 0n;
  const currentTick = currentXlmPerUsdc > 0 ? clampTick(priceToTick(currentXlmPerUsdc)) : 0;

  const [tickLower, setTickLower] = useState(0);
  const [tickUpper, setTickUpper] = useState(1);
  const [ticksReady, setTicksReady] = useState(false);
  const [amountXlm, setAmountXlm] = useState("");
  const [amountUsdc, setAmountUsdc] = useState("");
  const [activePreset, setActivePreset] = useState<number | null>(0.1);
  const [aprWindow, setAprWindow] = useState<"24H" | "7D" | "30D">("24H");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (currentXlmPerUsdc > 0 && !ticksReady) {
      const { tickLower: tl, tickUpper: tu } = applyPreset(currentXlmPerUsdc, 0.1, TICK_SPACING);
      /* eslint-disable react-hooks/set-state-in-effect */
      setTickLower(tl);
      setTickUpper(tu);
      setTicksReady(true);
      /* eslint-enable react-hooks/set-state-in-effect */
    }
  }, [currentXlmPerUsdc, ticksReady]);

  const sqrtLower = priceToSqrtPriceX64(tickToPrice(tickLower));
  const sqrtUpper = priceToSqrtPriceX64(tickToPrice(tickUpper));

  const minUsdcPerXlm = 1 / tickToPrice(tickUpper);
  const maxUsdcPerXlm = 1 / tickToPrice(tickLower);

  const price0Only = currentTick < tickLower;
  const price1Only = currentTick >= tickUpper;

  function syncFromXlm(raw: string) {
    setAmountXlm(raw);
    if (!raw || isNaN(parseFloat(raw))) { setAmountUsdc(""); return; }
    if (price0Only) return;
    const a1 = toStroops(raw);
    if (a1 === 0n) { setAmountUsdc(""); return; }
    const L = getLiquidityForAmounts(sqrtCurrent, sqrtLower, sqrtUpper, 10n ** 18n, a1);
    const { amount0: usdc } = getAmountsForLiquidity(sqrtCurrent, sqrtLower, sqrtUpper, L);
    setAmountUsdc(fromStroops(usdc));
  }

  function syncFromUsdc(raw: string) {
    setAmountUsdc(raw);
    if (!raw || isNaN(parseFloat(raw))) { setAmountXlm(""); return; }
    if (price1Only) return;
    const a0 = toStroops(raw);
    if (a0 === 0n) { setAmountXlm(""); return; }
    const L = getLiquidityForAmounts(sqrtCurrent, sqrtLower, sqrtUpper, a0, 10n ** 18n);
    const { amount1: xlm } = getAmountsForLiquidity(sqrtCurrent, sqrtLower, sqrtUpper, L);
    setAmountXlm(fromStroops(xlm));
  }

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (amountXlm && !price0Only) {
      const a1 = toStroops(amountXlm);
      if (a1 > 0n) {
        const L = getLiquidityForAmounts(sqrtCurrent, sqrtLower, sqrtUpper, 10n ** 18n, a1);
        const { amount0: usdc } = getAmountsForLiquidity(sqrtCurrent, sqrtLower, sqrtUpper, L);
        setAmountUsdc(fromStroops(usdc));
      }
    } else if (amountUsdc && !price1Only) {
      const a0 = toStroops(amountUsdc);
      if (a0 > 0n) {
        const L = getLiquidityForAmounts(sqrtCurrent, sqrtLower, sqrtUpper, a0, 10n ** 18n);
        const { amount1: xlm } = getAmountsForLiquidity(sqrtCurrent, sqrtLower, sqrtUpper, L);
        setAmountXlm(fromStroops(xlm));
      }
    }
  }, [tickLower, tickUpper, sqrtCurrent]); // eslint-disable-line react-hooks/exhaustive-deps
  /* eslint-enable react-hooks/set-state-in-effect */

  function applyPresetPct(pct: number) {
    const { tickLower: tl, tickUpper: tu } = applyPreset(currentXlmPerUsdc, pct, TICK_SPACING);
    setTickLower(tl);
    setTickUpper(tu);
    setActivePreset(pct);
  }

  function setMinPrice(usdcPerXlm: number) {
    if (usdcPerXlm <= 0) return;
    const t = clampTick(roundTick(priceToTick(1 / usdcPerXlm), TICK_SPACING));
    if (t > tickLower) { setTickUpper(t); setActivePreset(null); }
  }
  function setMaxPrice(usdcPerXlm: number) {
    if (usdcPerXlm <= 0) return;
    const t = clampTick(roundTick(priceToTick(1 / usdcPerXlm), TICK_SPACING));
    if (t < tickUpper) { setTickLower(t); setActivePreset(null); }
  }

  const a0Usdc = toStroops(amountUsdc);
  const a1Xlm = toStroops(amountXlm);
  const liquidity = getLiquidityForAmounts(sqrtCurrent, sqrtLower, sqrtUpper, a0Usdc, a1Xlm);

  const xlmValue = (parseFloat(amountXlm) || 0) * xlmUsd;
  const usdcValue = (parseFloat(amountUsdc) || 0) * usdcUsd;
  const totalValue = xlmValue + usdcValue;
  const ratioXlm = totalValue > 0 ? (xlmValue / totalValue) * 100 : 0;
  const ratioUsdc = 100 - ratioXlm;

  const estApr = useMemo(() => {
    if (minUsdcPerXlm <= 0 || maxUsdcPerXlm <= 0) return 0;
    const r = minUsdcPerXlm / maxUsdcPerXlm;
    const mult = r >= 1 ? 50 : Math.min(50, 1 / (1 - Math.pow(r, 0.25)));
    const base = 0.02;
    return Math.min(999, base * mult * 100);
  }, [minUsdcPerXlm, maxUsdcPerXlm]);

  const tvlUsd =
    reserves && xlmUsd > 0
      ? reserves.xlmReserve * xlmUsd + reserves.usdcReserve * usdcUsd
      : null;
  const livePrice = currentUsdcPerXlm;
  const change24h = market?.change24h ?? 0;

  function setXlmFraction(frac: number) {
    if (!balances) return;
    const usable = balances.xlm > XLM_GAS_RESERVE ? balances.xlm - XLM_GAS_RESERVE : 0n;
    const amt = frac === 1 ? usable : (balances.xlm * BigInt(Math.round(frac * 100))) / 100n;
    syncFromXlm(fromStroops(amt));
  }
  function setUsdcFraction(frac: number) {
    if (!balances) return;
    const amt = (balances.usdc * BigInt(Math.round(frac * 100))) / 100n;
    syncFromUsdc(fromStroops(amt));
  }

  async function handleAdd() {
    if (!address) { await connect(); return; }
    if (liquidity === 0n) return;
    setLoading(true);
    try {
      const deadline = BigInt(Math.floor(Date.now() / 1000) + 300);
      const currentLedger = await getLatestLedger();
      const approvalExpiry = currentLedger + 500;

      await trackTx("Add Liquidity", async (updateStep) => {
        if (a0Usdc > 0n && !(await hasTrustline(address, USDC_ASSET_CODE, USDC_ISSUER))) {
          updateStep("preparing");
          const trustXdr = await buildTrustlineTx(address, USDC_ASSET_CODE, USDC_ISSUER);
          updateStep("waiting_signature");
          const signedTrust = await sign(trustXdr);
          updateStep("submitting");
          updateStep("pending");
          await submitTransaction(signedTrust);
        }

        if (a1Xlm > 0n) {
          updateStep("preparing");
          const xdr = await buildApprovalTx(address, XLM_ADDRESS, POOL_ADDRESS, a1Xlm * 2n, approvalExpiry);
          updateStep("waiting_signature");
          const signed = await sign(xdr);
          updateStep("submitting");
          updateStep("pending");
          await submitTransaction(signed);
        }

        if (a0Usdc > 0n) {
          updateStep("preparing");
          const xdr = await buildApprovalTx(address, USDC_ADDRESS, POOL_ADDRESS, a0Usdc * 2n, approvalExpiry);
          updateStep("waiting_signature");
          const signed = await sign(xdr);
          updateStep("submitting");
          updateStep("pending");
          await submitTransaction(signed);
        }

        updateStep("preparing");
        const mintXdr = await buildMintTx(
          address, POOL_ADDRESS, tickLower, tickUpper, liquidity,
          0n, 0n, deadline
        );
        updateStep("waiting_signature");
        const signedMint = await sign(mintXdr);
        updateStep("submitting");
        updateStep("pending");
        const response = await submitTransaction(signedMint);

        return {
          hash: response.hash,
          ledger: response.ledger,
        };
      });

      queryClient.invalidateQueries({ queryKey: ["positions"] });
      queryClient.invalidateQueries({ queryKey: ["balances"] });
      router.push("/liquidity");
    } catch (err: unknown) {
      console.error("Add liquidity submission error:", err);
    } finally {
      setLoading(false);
    }
  }

  const canAdd = address && liquidity > 0n && !loading && ticksReady;
  const fmtP = (p: number) => (p >= 1 ? p.toFixed(4) : p.toFixed(6));

  return (
    <div className="w-full min-h-screen flex flex-col text-white bg-[#06060c]">
      <Navbar />
      <div className="flex-1 max-w-[1240px] w-full mx-auto px-4 sm:px-6 pt-28 pb-12">
        <button
          onClick={() => router.push("/liquidity")}
          className="bg-transparent border-none text-white/50 hover:text-white cursor-pointer text-sm mb-4 transition-colors"
        >
          ← Back to Positions
        </button>

        {/* Header bar */}
        <div className="p-4 sm:p-6 rounded-2xl bg-white/[0.02] border border-white/10 flex flex-wrap gap-4 items-center justify-between mb-6 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <div className="flex items-center">
              <span className="w-9 h-9 rounded-full bg-white/10 border border-white/10 flex items-center justify-center">
                <img src="/xlm.svg" alt="XLM" className="w-6 h-6 rounded-full object-contain" />
              </span>
              <span className="w-9 h-9 rounded-full bg-white/10 border border-white/10 flex items-center justify-center -ml-3">
                <img src="/usdc.svg" alt="USDC" className="w-6 h-6 rounded-full object-contain" />
              </span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg sm:text-xl font-extrabold text-white">XLM / USDC</span>
                <span className="text-xs font-bold rounded-full px-2.5 py-0.5 bg-white/15 text-white">0.3%</span>
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="live-dot" />
                <span className="text-xs sm:text-sm text-white/60">
                  ${fmtP(livePrice)}{" "}
                  <span className={change24h >= 0 ? "text-green-400" : "text-red-400"}>
                    {change24h >= 0 ? "▲" : "▼"} {Math.abs(change24h * 100).toFixed(2)}%
                  </span>{" "}
                  · Live Coinbase
                </span>
              </div>
            </div>
          </div>
          <div className="flex gap-6 sm:gap-8 flex-wrap">
            <Stat label="Liquidity (TVL)" value={tvlUsd !== null ? formatUsd(tvlUsd) : "—"} />
            <Stat label="Pool Reserves" value={reserves ? `${compact(reserves.xlmReserve)} XLM` : "—"} sub={reserves ? `${compact(reserves.usdcReserve)} USDC` : undefined} />
            <Stat label="Current Price" value={currentUsdcPerXlm > 0 ? `$${fmtP(currentUsdcPerXlm)}` : "—"} sub="USDC per XLM" />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Set Price Range */}
          <div className="lg:col-span-7 p-5 sm:p-6 rounded-2xl bg-white/[0.02] border border-white/10 backdrop-blur-xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-base sm:text-lg font-bold text-white">Set Price Range</h2>
              <span className="text-xs text-white/50">USDC per XLM</span>
            </div>

            {!ticksReady ? (
              <div className="h-72 flex items-center justify-center gap-2 text-white/50 text-sm">
                <div className="spinner w-4 h-4" />
                Loading live price…
              </div>
            ) : (
              <LiquidityChart
                currentPrice={currentUsdcPerXlm}
                priceLower={minUsdcPerXlm}
                priceUpper={maxUsdcPerXlm}
                low24h={market?.low24h ?? null}
                high24h={market?.high24h ?? null}
                onPriceLowerChange={setMinPrice}
                onPriceUpperChange={setMaxPrice}
                disabled={!ticksReady}
              />
            )}

            {/* Min / Max inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-5">
              <PriceField label="Min Price" sub="USDC per XLM" value={minUsdcPerXlm} onCommit={setMinPrice} />
              <PriceField label="Max Price" sub="USDC per XLM" value={maxUsdcPerXlm} onCommit={setMaxPrice} />
            </div>

            {/* Presets */}
            <div className="flex gap-2 flex-wrap mt-4 items-center">
              {PRESETS.map((p) => (
                <button
                  key={p.label}
                  onClick={() => applyPresetPct(p.pct)}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer transition-all ${
                    activePreset === p.pct
                      ? "border-cyan-400 bg-cyan-400/10 text-cyan-300"
                      : "border-white/10 text-white/60 hover:text-white"
                  }`}
                >
                  {p.label}
                </button>
              ))}
              <span className="text-xs text-white/40 ml-auto">
                Ticks {tickLower} → {tickUpper}
              </span>
            </div>

            {/* Estimated APR */}
            <div className="mt-5 p-4 rounded-xl bg-white/[0.02] border border-white/10">
              <div className="flex justify-between items-center mb-3">
                <span className="text-sm font-bold text-white">Estimated APR</span>
                <div className="flex gap-1 bg-white/5 rounded-lg p-1">
                  {(["24H", "7D", "30D"] as const).map((w) => (
                    <button key={w} onClick={() => setAprWindow(w)} className={`px-2.5 py-1 rounded-md text-xs font-semibold ${
                      aprWindow === w ? "bg-white/20 text-white" : "text-white/50"
                    }`}>{w}</button>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-2xl font-extrabold text-white">{estApr.toFixed(2)}%</span>
                <AprDonut aprPct={estApr} />
                <div className="text-xs text-white/50 leading-relaxed">
                  <div><span className="text-white">●</span> Trade fees (0.3% tier)</div>
                  <div className="mt-0.5">Narrower range earns higher yield</div>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Deposit Amounts */}
          <div className="lg:col-span-5 p-5 sm:p-6 rounded-2xl bg-white/[0.02] border border-white/10 backdrop-blur-xl flex flex-col gap-4">
            <h2 className="text-base sm:text-lg font-bold text-white">Add Deposit Amount</h2>

            {(price0Only || price1Only) && (
              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-3 text-xs text-yellow-400 leading-relaxed">
                {price0Only
                  ? <><strong>Price is below your range.</strong> Deposit will be 100% USDC.</>
                  : <><strong>Price is above your range.</strong> Deposit will be 100% XLM.</>}
              </div>
            )}

            <TokenBox
              symbol="XLM" icon="/xlm.svg"
              value={amountXlm}
              usd={xlmValue}
              balance={balances ? parseFloat(fromStroops(balances.xlm)) : null}
              disabled={price0Only}
              onChange={syncFromXlm}
              onMax={() => setXlmFraction(1)}
              onHalf={() => setXlmFraction(0.5)}
            />

            <div className="flex justify-center">
              <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white text-base font-bold">+</div>
            </div>

            <TokenBox
              symbol="USDC" icon="/usdc.svg"
              value={amountUsdc}
              usd={usdcValue}
              balance={balances ? parseFloat(fromStroops(balances.usdc)) : null}
              disabled={price1Only}
              onChange={syncFromUsdc}
              onMax={() => setUsdcFraction(1)}
              onHalf={() => setUsdcFraction(0.5)}
            />

            {/* Totals */}
            <div className="bg-white/[0.02] border border-white/10 rounded-xl p-4 flex flex-col gap-2.5">
              <div className="flex justify-between items-center">
                <span className="text-white/50 text-xs">Total Deposit</span>
                <span className="text-white text-base font-bold">{totalValue > 0 ? formatUsd(totalValue) : "$0.00"}</span>
              </div>
              <div className="flex justify-between items-center text-xs text-white/50">
                <span>Deposit Ratio</span>
                <span className="inline-flex items-center gap-1">
                  {ratioXlm.toFixed(1)}% <img src="/xlm.svg" alt="XLM" className="w-3 h-3 rounded-full" /> / {ratioUsdc.toFixed(1)}% <img src="/usdc.svg" alt="USDC" className="w-3 h-3 rounded-full" />
                </span>
              </div>
              <div className="flex h-1.5 rounded-full overflow-hidden bg-white/5">
                <div style={{ width: `${ratioXlm}%` }} className="bg-cyan-400" />
                <div style={{ width: `${ratioUsdc}%` }} className="bg-purple-500" />
              </div>
            </div>

            <button className="btn-primary w-full py-4 text-base font-bold rounded-xl transition-all shadow-lg" onClick={handleAdd} disabled={!canAdd}>
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="spinner w-4 h-4" /> Processing…
                </span>
              ) : !address ? "Connect Wallet" : liquidity === 0n ? "Enter Amounts" : "Add Liquidity"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div>
      <div className="text-[11px] text-white/40 mb-0.5">{label}</div>
      <div className="text-base font-bold text-white">{value}</div>
      {sub && <div className="text-[11px] text-white/40">{sub}</div>}
    </div>
  );
}

function PriceField({ label, sub, value, onCommit }: { label: string; sub: string; value: number; onCommit: (v: number) => void }) {
  return (
    <div className="bg-white/[0.02] border border-white/10 rounded-xl p-3">
      <div className="text-[11px] text-white/40 mb-1">{label}</div>
      <input
        type="number" step="any"
        key={value.toFixed(8)}
        defaultValue={value >= 1 ? value.toFixed(4) : value.toFixed(6)}
        onBlur={(e) => { const p = parseFloat(e.target.value); if (p > 0) onCommit(p); }}
        onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
        className="w-full bg-transparent border-none outline-none text-white text-base font-bold font-jetbrains"
      />
      <div className="text-[11px] text-white/40 mt-0.5">{sub}</div>
    </div>
  );
}

function TokenBox({ symbol, icon, value, usd, balance, disabled, onChange, onMax, onHalf }: {
  symbol: string; icon: string; value: string; usd: number; balance: number | null;
  disabled: boolean; onChange: (v: string) => void; onMax: () => void; onHalf: () => void;
}) {
  return (
    <div className={`p-4 rounded-xl bg-white/[0.03] border border-white/10 ${disabled ? "opacity-45" : ""}`}>
      <div className="flex justify-between items-center mb-2.5">
        <span className="flex items-center gap-2 bg-white/[0.06] border border-white/10 rounded-lg px-3 py-1.5">
          <img src={icon} alt={symbol} className="w-5 h-5 rounded-full object-contain" />
          <span className="text-white font-bold text-sm">{symbol}</span>
        </span>
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] text-white/40 mr-1">Bal {balance !== null ? balance.toLocaleString(undefined, { maximumFractionDigits: 2 }) : "—"}</span>
          <button onClick={onHalf} disabled={disabled} className="px-2 py-0.5 rounded border border-white/10 bg-transparent text-white text-xs font-semibold cursor-pointer">50%</button>
          <button onClick={onMax} disabled={disabled} className="px-2 py-0.5 rounded border border-white/10 bg-transparent text-white text-xs font-semibold cursor-pointer">Max</button>
        </div>
      </div>
      <input
        type="text" inputMode="decimal" placeholder="0.0"
        value={value} disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-transparent border-none outline-none text-white text-2xl font-semibold text-right font-jetbrains"
      />
      {usd > 0 && <div className="text-[11px] text-white/40 text-right mt-1">≈ {formatUsd(usd)}</div>}
    </div>
  );
}

function compact(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(2) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(2) + "K";
  return n.toFixed(2);
}
