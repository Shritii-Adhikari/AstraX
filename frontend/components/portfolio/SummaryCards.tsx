"use client";

import { Position } from "@/hooks/usePositions";
import { fromStroops } from "@/lib/math";
import { usePrices } from "@/hooks/usePrices";

interface Props {
  positions: Position[];
}

export default function SummaryCards({ positions }: Props) {
  const { xlmUsd, usdcUsd } = usePrices();

  // Use real CoinGecko USD prices: token_0 = USDC, token_1 = XLM
  const totalValueUsd = positions.reduce((acc, p) => {
    const usdc = parseFloat(fromStroops(p.amount0)) * usdcUsd;
    const xlm  = parseFloat(fromStroops(p.amount1)) * xlmUsd;
    return acc + usdc + xlm;
  }, 0);

  const totalFees0 = positions.reduce((acc, p) => acc + p.tokensOwed0, 0n);
  const totalFees1 = positions.reduce((acc, p) => acc + p.tokensOwed1, 0n);
  const totalFeesUsd =
    parseFloat(fromStroops(totalFees0)) * usdcUsd +
    parseFloat(fromStroops(totalFees1)) * xlmUsd;

  const inRangeCount = positions.filter((p) => p.inRange).length;

  const cards = [
    {
      label: "Total Position Value",
      value: `$${totalValueUsd.toFixed(2)}`,
      sub: `${positions.length} position${positions.length !== 1 ? "s" : ""}`,
      color: "text-white",
      icon: "💼",
    },
    {
      label: "Uncollected Fees",
      value: `$${totalFeesUsd.toFixed(4)}`,
      sub: `${fromStroops(totalFees0, 7)} USDC + ${fromStroops(totalFees1, 7)} XLM`,
      color: "text-green-400",
      icon: "💰",
    },
    {
      label: "Active Positions",
      value: `${inRangeCount} / ${positions.length}`,
      sub: "Currently in range",
      color: inRangeCount === positions.length ? "text-green-400" : "text-yellow-400",
      icon: "📊",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
      {cards.map(({ label, value, sub, color, icon }) => (
        <div
          key={label}
          className="p-6 rounded-2xl bg-white/[0.02] border border-white/10 backdrop-blur-xl flex flex-col justify-between"
        >
          <div className="flex justify-between items-start mb-3">
            <span className="text-white/50 text-xs font-medium">{label}</span>
            <span className="text-xl">{icon}</span>
          </div>
          <div>
            <p className={`text-2xl sm:text-3xl font-extrabold tracking-tight mb-1 ${color}`}>
              {value}
            </p>
            <p className="text-white/40 text-xs truncate">{sub}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
