"use client";

import { useState } from "react";
import { Repeat, SlidersHorizontal } from "lucide-react";
import TokenInputBox from "@/components/swap/TokenInputBox";
import PriceInfo from "@/components/swap/PriceInfo";
import SlippageSettings from "@/components/swap/SlippageSettings";
import { useWallet } from "@/hooks/useWallet";
import Navbar from "@/components/Navbar";
import { usePool } from "@/hooks/usePool";
import { useSwapQuote } from "@/hooks/useSwapQuote";
import { usePrices } from "@/hooks/usePrices";
import { toStroops, fromStroops, computePriceImpact, toUsd, formatUsd, sqrtPriceX64ToPrice } from "@/lib/math";
import { buildSwapTx, buildApprovalTx } from "@/lib/transactions";
import { submitTransaction, getLatestLedger } from "@/lib/stellar";
import { POOL_ADDRESS } from "@/lib/stellar/contracts";
import { XLM_ADDRESS, USDC_ADDRESS, FEE_TIER } from "@/lib/stellar/assets";
import { useToast } from "@/components/Toast";
import { useTxTracker } from "@/context/TxTrackerContext";

const XLM = { symbol: "XLM", name: "Stellar Lumens", logo: "/xlm.svg" };
const USDC = { symbol: "USDC", name: "USD Coin", logo: "/usdc.svg" };

export default function SwapPage() {
  const { address, connect, sign } = useWallet();
  const { data: pool } = usePool();
  const prices = usePrices();
  const { addToast } = useToast();
  const { trackTx } = useTxTracker();

  const [amountIn, setAmountIn] = useState("");
  const [slippage, setSlippage] = useState(0.5);
  const [zeroForOne, setZeroForOne] = useState(true); // XLM → USDC
  const [loading, setLoading] = useState(false);
  const [highImpactAcknowledged, setHighImpactAcknowledged] = useState(false);

  const tokenIn = zeroForOne ? XLM : USDC;
  const tokenOut = zeroForOne ? USDC : XLM;

  const amountInStroops = toStroops(amountIn);
  const currentPrice = pool?.currentPrice ?? 0;

  const { data: quote, isFetching: quoteFetching, refetch: refetchQuote } = useSwapQuote(
    amountInStroops,
    zeroForOne,
    currentPrice,
    amountInStroops > 0n
  );

  const amountOut = quote ? fromStroops(quote.amountOut) : "";
  const slippageBps = BigInt(Math.round(slippage * 100));
  const amountOutMin = quote
    ? (quote.amountOut * (10000n - slippageBps)) / 10000n
    : 0n;

  const poolXlmPerUsdc = pool ? sqrtPriceX64ToPrice(pool.sqrtPriceX64) : 0;
  const usdcPerXlm = poolXlmPerUsdc > 0 ? 1 / poolXlmPerUsdc : 0;
  const xlmPerUsdc = poolXlmPerUsdc;
  const rate = pool
    ? zeroForOne
      ? `1 XLM ≈ ${usdcPerXlm.toFixed(4)} USDC`
      : `1 USDC ≈ ${xlmPerUsdc.toFixed(4)} XLM`
    : "—";

  const feeAmount = amountInStroops > 0n
    ? fromStroops((amountInStroops * 3n) / 1000n)
    : "0";

  const spotPriceOutPerIn = pool
    ? zeroForOne ? usdcPerXlm : xlmPerUsdc
    : 0;
  const amountInNum = parseFloat(amountIn) || 0;
  const amountOutNum = parseFloat(amountOut) || 0;
  const amountInUsd = toUsd(amountInNum, zeroForOne ? "xlm" : "usdc", prices);
  const priceImpactResult = computePriceImpact(
    amountInNum,
    amountOutNum,
    spotPriceOutPerIn,
    null,
    amountInUsd
  );

  async function handleSwap() {
    if (!address) {
      await connect();
      return;
    }
    if (!quote || amountInStroops === 0n) return;

    setLoading(true);
    try {
      const freshResult = await refetchQuote();
      const freshQuote = freshResult.data;
      if (freshQuote && quote.amountOut > 0n) {
        const outputDiff = freshQuote.amountOut > quote.amountOut
          ? freshQuote.amountOut - quote.amountOut
          : quote.amountOut - freshQuote.amountOut;
        const outputDiffPct = Number(outputDiff) / Number(quote.amountOut);
        if (outputDiffPct > slippage / 100) {
          addToast(
            `Price moved ${(outputDiffPct * 100).toFixed(2)}% since your quote. Please review the new rate.`,
            "error"
          );
          setLoading(false);
          return;
        }
      }

      const deadline = BigInt(Math.floor(Date.now() / 1000) + 300);
      const tokenInAddress = zeroForOne ? XLM_ADDRESS : USDC_ADDRESS;
      const tokenOutAddress = zeroForOne ? USDC_ADDRESS : XLM_ADDRESS;

      await trackTx(`Swap ${amountIn} ${tokenIn.symbol} → ${tokenOut.symbol}`, async (updateStep) => {
        updateStep("preparing");
        const currentLedger = await getLatestLedger();
        const approvalXdr = await buildApprovalTx(
          address,
          tokenInAddress,
          POOL_ADDRESS,
          amountInStroops * 2n,
          currentLedger + 500
        );

        updateStep("waiting_signature");
        const signedApproval = await sign(approvalXdr);

        updateStep("submitting");
        updateStep("pending");
        await submitTransaction(signedApproval);

        updateStep("preparing");
        const swapXdr = await buildSwapTx(
          address,
          tokenInAddress,
          tokenOutAddress,
          FEE_TIER,
          amountInStroops,
          amountOutMin,
          deadline,
          0n
        );

        updateStep("waiting_signature");
        const signedSwap = await sign(swapXdr);

        updateStep("submitting");
        updateStep("pending");
        const response = await submitTransaction(signedSwap);

        return {
          hash: response.hash,
          ledger: response.ledger,
        };
      });

      setAmountIn("");
    } catch (err: unknown) {
      console.error("Swap submission error:", err);
    } finally {
      setLoading(false);
    }
  }

  const canSwap =
    address &&
    amountInStroops > 0n &&
    quote &&
    quote.amountOut > 0n &&
    !loading &&
    (priceImpactResult.severity !== "very_high" || highImpactAcknowledged);

  return (
    <div className="w-full min-h-screen flex flex-col text-white bg-[#06060c]">
      <Navbar />
      <div
        className="flex-1 flex items-center justify-center px-4 pt-28 pb-12"
      >
        <div className="w-full max-w-[480px] relative">
          {/* Floating settings button */}
          <div className="swap-settings-btn absolute right-2 -top-14 z-10 sm:right-0">
            <SlippageSettings
              slippage={slippage}
              onChange={setSlippage}
              trigger={
                <button
                  className="w-12 h-12 rounded-full bg-white/[0.04] border border-white/10 hover:border-cyan-500/40 hover:bg-white/[0.08] transition-all flex items-center justify-center cursor-pointer shadow-lg"
                  title="Slippage settings"
                >
                  <SlidersHorizontal size={18} className="text-white transform rotate-90" />
                </button>
              }
            />
          </div>

          {/* Card */}
          <div
            className="w-full p-4 sm:p-6 rounded-[32px] bg-[#0c0d14]/90 border border-white/10 shadow-[0_12px_40px_rgba(0,0,0,0.6)] backdrop-blur-2xl"
          >
            <div className="relative flex flex-col gap-3">
              {/* Sell */}
              <TokenInputBox
                token={tokenIn}
                value={amountIn}
                onChange={setAmountIn}
                label="Sell"
                usdValue={
                  amountInUsd > 0 && !prices.isError ? formatUsd(amountInUsd).replace("$", "") : undefined
                }
              />

              {/* Flip button */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
                <button
                  onClick={() => {
                    setZeroForOne((z) => !z);
                    setAmountIn("");
                  }}
                  className="w-12 h-12 rounded-full bg-[#121420] border border-white/15 hover:border-cyan-400 hover:scale-110 active:scale-95 transition-all text-white flex items-center justify-center shadow-xl cursor-pointer"
                  title="Flip tokens"
                >
                  <Repeat size={18} className="text-cyan-400" />
                </button>
              </div>

              {/* Buy */}
              <TokenInputBox
                token={tokenOut}
                value={amountOut}
                readOnly
                label="Buy"
                loading={quoteFetching && amountInStroops > 0n}
                usdValue={(() => {
                  const outUsd = toUsd(amountOutNum, zeroForOne ? "usdc" : "xlm", prices);
                  return outUsd > 0 && !prices.isError ? formatUsd(outUsd).replace("$", "") : undefined;
                })()}
              />
            </div>

            {/* Price info */}
            {quote && amountOut && (
              <div className="mt-4 px-1">
                <PriceInfo
                  rate={rate}
                  priceImpact={priceImpactResult.impact}
                  minimumReceived={`${fromStroops(amountOutMin)} ${tokenOut.symbol}`}
                  fee={`${feeAmount} ${tokenIn.symbol}`}
                  slippage={slippage}
                  isThinPool={priceImpactResult.isThinPool}
                  lastFetchedAt={pool?.lastFetchedAt}
                  onHighImpactAcknowledged={setHighImpactAcknowledged}
                />
              </div>
            )}

            {/* Swap button */}
            <button
              className="btn-primary w-full py-4 mt-4 text-sm sm:text-base font-bold tracking-wider uppercase rounded-2xl transition-all shadow-[0_0_20px_rgba(0,212,255,0.2)]"
              onClick={handleSwap}
              disabled={!canSwap && Boolean(address)}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="spinner w-4 h-4" />
                  Swapping...
                </span>
              ) : !address ? (
                "Connect Wallet"
              ) : amountInStroops === 0n ? (
                "Enter Amount"
              ) : quoteFetching ? (
                "Fetching Quote..."
              ) : !quote || quote.amountOut === 0n ? (
                "Insufficient Liquidity"
              ) : (
                `Swap ${tokenIn.symbol} → ${tokenOut.symbol}`
              )}
            </button>
          </div>

          {/* Pool info footer */}
          {pool && (
            <div className="mt-6 flex justify-center gap-6 text-center">
              {[
                { label: "Liquidity", value: `${fromStroops(pool.liquidity)} L` },
                { label: "Tick", value: `${pool.tick}` },
                { label: "Fee Tier", value: "0.3%" },
              ].map(({ label, value }) => (
                <div key={label}>
                  <p className="text-white/40 text-xs">{label}</p>
                  <p className="text-white/80 text-sm font-semibold mt-0.5">{value}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
