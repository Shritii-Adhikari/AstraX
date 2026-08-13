"use client";

import Link from "next/link";
import { useWallet } from "@/hooks/useWallet";
import { usePositions } from "@/hooks/usePositions";
import { usePool } from "@/hooks/usePool";
import PositionCard from "@/components/liquidity/PositionCard";
import { useQueryClient } from "@tanstack/react-query";
import Navbar from "@/components/Navbar";

export default function LiquidityPage() {
  const { address, connect } = useWallet();
  const { data: positions, isLoading, refetch } = usePositions(address);
  const { data: pool } = usePool();
  const queryClient = useQueryClient();

  function handleRefresh() {
    refetch();
    queryClient.invalidateQueries({ queryKey: ["positions"] });
    queryClient.invalidateQueries({ queryKey: ["balances"] });
    queryClient.invalidateQueries({ queryKey: ["pool"] });
  }

  return (
    <div className="w-full min-h-screen flex flex-col text-white bg-[#06060c]">
      <Navbar />
      <div className="flex-1 max-w-[960px] w-full mx-auto px-4 sm:px-6 pt-28 pb-12">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-white/90 to-white/70 bg-clip-text text-transparent">
              Liquidity Positions
            </h1>
            <p className="text-white/50 text-sm mt-1">
              Provide concentrated liquidity to earn 0.3% trading fees on XLM/USDC
            </p>
          </div>
          <Link href="/liquidity/new">
            <button className="btn-primary px-6 py-3 text-sm font-bold rounded-xl shrink-0 shadow-lg shadow-cyan-500/10">
              + Add Liquidity
            </button>
          </Link>
        </div>

        {/* Pool stats */}
        {pool && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            {[
              { label: "Current Price", value: `$${(1 / pool.currentPrice).toFixed(4)}`, sub: "USDC per XLM" },
              { label: "Current Tick", value: pool.tick.toString(), sub: "Pool tick index" },
              { label: "Active Liquidity", value: pool.liquidity > 0n ? "Active" : "No liquidity", sub: "0.3% fee tier" },
            ].map(({ label, value, sub }) => (
              <div
                key={label}
                className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 text-center backdrop-blur-xl"
              >
                <p className="text-white/40 text-xs mb-1">{label}</p>
                <p className="text-white font-bold text-lg">{value}</p>
                <p className="text-white/30 text-[11px] mt-0.5">{sub}</p>
              </div>
            ))}
          </div>
        )}

        {/* Positions */}
        {!address ? (
          <EmptyState
            title="Connect your wallet"
            desc="Connect Freighter wallet to view and manage your liquidity positions"
            action={<button className="btn-primary px-6 py-3 font-bold text-sm rounded-xl" onClick={connect}>Connect Wallet</button>}
          />
        ) : isLoading ? (
          <div className="flex flex-col gap-4">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="h-48 rounded-2xl bg-white/[0.02] border border-white/10 animate-pulse"
              />
            ))}
          </div>
        ) : positions && positions.length > 0 ? (
          <div className="flex flex-col gap-4">
            {positions.map((p) => (
              <PositionCard key={p.id.toString()} position={p} onRefresh={handleRefresh} />
            ))}
          </div>
        ) : (
          <EmptyState
            title="No positions yet"
            desc="Add liquidity to the XLM/USDC pool to start earning fees"
            action={
              <Link href="/liquidity/new">
                <button className="btn-primary px-6 py-3 font-bold text-sm rounded-xl">
                  Add Liquidity
                </button>
              </Link>
            }
          />
        )}
      </div>
    </div>
  );
}

function EmptyState({
  title,
  desc,
  action,
}: {
  title: string;
  desc: string;
  action: React.ReactNode;
}) {
  return (
    <div className="text-center py-16 px-6 rounded-2xl bg-white/[0.02] border border-white/10 backdrop-blur-xl">
      <div className="text-4xl mb-3">💧</div>
      <h2 className="text-white font-bold text-lg mb-2">{title}</h2>
      <p className="text-white/40 text-sm max-w-sm mx-auto mb-6">{desc}</p>
      {action}
    </div>
  );
}
