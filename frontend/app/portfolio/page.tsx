"use client";

import React, { useEffect } from "react";
import { useWallet } from "@/hooks/useWallet";
import { usePositions } from "@/hooks/usePositions";
import SummaryCards from "@/components/portfolio/SummaryCards";
import ActivityFeed from "@/components/portfolio/ActivityFeed";
import PositionCard from "@/components/liquidity/PositionCard";
import UserProfileCard from "@/components/portfolio/UserProfileCard";
import StellarWalletPanel from "@/components/wallet/StellarWalletPanel";
import ContractStatus from "@/components/ContractStatus";
import Link from "next/link";
import Navbar from "@/components/Navbar";

export default function PortfolioPage() {
  const { address, connect } = useWallet();
  const { data: positions, isLoading, refetch } = usePositions(address);

  useEffect(() => {
    document.body.classList.add("xero-body");
    return () => {
      document.body.classList.remove("xero-body");
    };
  }, []);

  function handleRefresh() {
    refetch();
  }

  return (
    <div className="w-full min-h-screen flex flex-col items-center pb-24 text-white bg-[#06060c]">
      {/* Navbar */}
      <Navbar />

      {/* Main Content Container */}
      <div className="w-full max-w-[1020px] px-4 sm:px-6 pt-28 flex flex-col">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-white/90 to-white/70 bg-clip-text text-transparent">
            User Portfolio
          </h1>
          <p className="text-white/40 text-xs sm:text-sm mt-1">
            {address
              ? `${address.slice(0, 10)}...${address.slice(-8)}`
              : "Connect your wallet to view your positions, balances, and history"}
          </p>
        </div>

        {/* Live on-chain pool status */}
        <ContractStatus />

        {/* On-chain user profile metadata */}
        <UserProfileCard />

        {/* Freighter wallet panel */}
        <StellarWalletPanel />

        {!address ? (
          <div className="text-center py-16 px-6 rounded-2xl bg-white/[0.02] border border-white/10 backdrop-blur-xl">
            <h2 className="text-white text-lg sm:text-xl font-bold mb-2">
              Connect to view your portfolio
            </h2>
            <p className="text-white/40 text-sm mb-6 max-w-md mx-auto">
              Your active positions, fees earned, and recent Stellar transaction history will be shown here.
            </p>
            <button
              className="btn-primary px-8 py-3.5 text-sm font-bold rounded-xl"
              onClick={connect}
            >
              Connect Freighter Wallet
            </button>
          </div>
        ) : (
          <>
            {/* Summary cards */}
            {positions && positions.length > 0 && (
              <SummaryCards positions={positions} />
            )}

            {/* Positions */}
            <div className="mb-10">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-white text-lg font-bold">Positions</h2>
                <Link href="/liquidity/new">
                  <button className="btn-primary px-4 py-2 text-xs sm:text-sm font-bold rounded-xl">
                    + New Position
                  </button>
                </Link>
              </div>

              {isLoading ? (
                <div className="flex flex-col gap-3">
                  {[1, 2].map((i) => (
                    <div
                      key={i}
                      className="h-44 rounded-2xl bg-white/[0.02] border border-white/10 animate-pulse"
                    />
                  ))}
                </div>
              ) : positions && positions.length > 0 ? (
                <div className="flex flex-col gap-3">
                  {positions.map((p) => (
                    <PositionCard
                      key={p.id.toString()}
                      position={p}
                      onRefresh={handleRefresh}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-14 px-6 rounded-2xl bg-white/[0.02] border border-white/10 backdrop-blur-xl">
                  <div className="text-4xl mb-3">📭</div>
                  <p className="text-white font-bold text-base mb-1">
                    No positions found
                  </p>
                  <p className="text-white/40 text-sm mb-5">
                    Provide liquidity to the XLM/USDC pool to earn trading fees
                  </p>
                  <Link href="/liquidity/new">
                    <button className="btn-primary px-6 py-3 font-bold text-sm rounded-xl">
                      Add Liquidity
                    </button>
                  </Link>
                </div>
              )}
            </div>

            {/* Activity feed */}
            <div>
              <h2 className="text-white text-lg font-bold mb-4">
                Recent On-Chain Activity
              </h2>
              <div className="p-4 sm:p-5 rounded-2xl bg-white/[0.02] border border-white/10 backdrop-blur-xl">
                <ActivityFeed walletAddress={address} />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
