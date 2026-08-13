"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Loader2, ArrowRight, CheckCircle2 } from "lucide-react";
import { useGlobalWallet } from "@/context/WalletContext";

interface WalletOption {
  id: "freighter" | "albedo" | "xbull" | "lobstr";
  name: string;
  description: string;
  installUrl: string;
  icon: React.ReactNode;
}

const WALLET_OPTIONS: WalletOption[] = [
  {
    id: "freighter",
    name: "Freighter",
    description: "Official Stellar browser extension",
    installUrl: "https://freighter.app",
    icon: (
      <svg className="w-8 h-8" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="100" height="100" rx="24" fill="#3D81E3" />
        <path d="M25 35H75V43H45V50H70V58H45V73H35V35" fill="white" />
        <circle cx="70" cy="69" r="6" fill="#A4F4FD" />
      </svg>
    ),
  },
  {
    id: "albedo",
    name: "Albedo",
    description: "Secure web-based Stellar signer",
    installUrl: "https://albedo.link",
    icon: (
      <svg className="w-8 h-8" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="100" height="100" rx="24" fill="#00d2ff" />
        <path d="M50 22L78 70H22L50 22Z" fill="white" />
        <circle cx="50" cy="50" r="10" fill="#091020" />
      </svg>
    ),
  },
  {
    id: "xbull",
    name: "xBull",
    description: "Powerful developer-first wallet",
    installUrl: "https://xbull.app",
    icon: (
      <svg className="w-8 h-8" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="100" height="100" rx="24" fill="#E08B26" />
        <path d="M30 40C40 40 50 30 50 30C50 30 60 40 70 40C70 55 50 75 50 75C50 75 30 55 30 40Z" fill="white" />
        <path d="M45 48H55V60H45V48Z" fill="#E08B26" />
      </svg>
    ),
  },
  {
    id: "lobstr",
    name: "LOBSTR",
    description: "Popular mobile & web Stellar wallet",
    installUrl: "https://lobstr.co",
    icon: (
      <svg className="w-8 h-8" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="100" height="100" rx="24" fill="#2E3B5C" />
        <path d="M30 70C30 50 45 35 60 35H70V45H60C50 45 40 53 40 70H30Z" fill="#A4F4FD" />
        <path d="M50 55C55 55 60 50 60 45C60 40 55 35 50 35C45 35 40 40 40 45C40 50 45 55 50 55Z" fill="white" />
      </svg>
    ),
  },
];

export default function WalletModal() {
  const {
    isModalOpen,
    setIsModalOpen,
    connect,
    hasFreighter,
    isLoading: kitLoading,
  } = useGlobalWallet();

  const [connectingId, setConnectingId] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  if (!isModalOpen) return null;

  const handleWalletSelect = async (wallet: WalletOption) => {
    setConnectingId(wallet.id);
    setLocalError(null);
    try {
      await connect(wallet.id);
      setIsModalOpen(false);
    } catch (err) {
      setLocalError((err as Error)?.message || `Failed to connect to ${wallet.name}`);
    } finally {
      setConnectingId(null);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setIsModalOpen(false)}
          className="absolute inset-0 bg-black/60 backdrop-blur-md"
        />

        {/* Modal Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 16 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="relative w-full max-w-[420px] rounded-[28px] border border-white/10 bg-[#0d0b14] p-6 shadow-2xl overflow-hidden z-10"
        >
          {/* Accent Glow */}
          <div className="absolute -top-24 -left-24 w-48 h-48 rounded-full bg-[#3D81E3]/10 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -right-24 w-48 h-48 rounded-full bg-[#A4F4FD]/10 blur-3xl pointer-events-none" />

          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-bold text-white leading-tight">Connect Wallet</h3>
              <p className="text-xs text-white/40 mt-1">Select a Stellar wallet to get started</p>
            </div>
            <button
              onClick={() => setIsModalOpen(false)}
              className="p-1.5 rounded-full hover:bg-white/10 border border-white/5 text-white/50 hover:text-white transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* List of Wallets */}
          <div className="flex flex-col gap-2.5">
            {WALLET_OPTIONS.map((wallet) => {
              const isSelected = connectingId === wallet.id;
              const isFreighterAvailable = wallet.id === "freighter" ? hasFreighter !== false : true;

              return (
                <button
                  key={wallet.id}
                  onClick={() => handleWalletSelect(wallet)}
                  disabled={!!connectingId}
                  className="group relative flex items-center justify-between w-full p-3.5 rounded-2xl border border-white/5 hover:border-white/15 bg-white/[0.02] hover:bg-white/[0.06] active:scale-[0.98] transition-all disabled:opacity-50 disabled:scale-100 disabled:cursor-not-allowed text-left cursor-pointer"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex-shrink-0 transition-transform group-hover:scale-105">
                      {wallet.icon}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-white text-[15px]">{wallet.name}</span>
                        {!isFreighterAvailable && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded border border-amber-500/30 bg-amber-500/10 text-amber-400 font-medium">
                            Not Installed
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-white/40 mt-0.5 line-clamp-1">{wallet.description}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-center w-8 h-8 rounded-full border border-white/5 bg-white/5 text-white/30 group-hover:text-white group-hover:border-white/20 transition-all">
                    {isSelected ? (
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                    ) : !isFreighterAvailable ? (
                      <a
                        href={wallet.installUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-xs text-[#3D81E3] font-semibold hover:underline"
                      >
                        Install
                      </a>
                    ) : (
                      <ArrowRight className="w-4 h-4" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Connection Error Banner */}
          {localError && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-5 p-3 rounded-xl border border-rose-500/20 bg-rose-500/5 text-rose-400 text-xs leading-relaxed"
            >
              <div className="font-semibold">Connection Failed</div>
              <div className="mt-0.5 opacity-80">{localError}</div>
            </motion.div>
          )}

          {/* Help Footer */}
          <div className="mt-6 pt-4 border-t border-white/5 text-center">
            <span className="text-xs text-white/30">
              New to Stellar?{" "}
              <a
                href="https://stellar.org/learn"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#3D81E3] hover:underline"
              >
                Learn about wallets
              </a>
            </span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
