"use client";

import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useGlobalWallet } from "@/context/WalletContext";
import { ChevronDown, Copy, Check, ExternalLink, LogOut, Disc, Loader2 } from "lucide-react";

export default function WalletButton() {
  const {
    address,
    balance,
    isConnected,
    isLoading,
    error,
    hasFreighter,
    connect,
    disconnect,
    refreshBalance
  } = useGlobalWallet();

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleCopy = () => {
    if (address) {
      navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleConnect = async () => {
    await connect();
  };

  // Shorten address to GXXX...XXXX
  const displayAddress = address
    ? `${address.slice(0, 4)}...${address.slice(-4)}`
    : "";

  if (!isConnected) {
    return (
      <div className="relative">
        <button
          onClick={handleConnect}
          disabled={isLoading}
          className="group relative inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-full bg-white text-black font-semibold text-sm transition-all duration-200 hover:bg-white/90 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-black" />
              <span>Connecting...</span>
            </>
          ) : (
            <span>Connect Wallet</span>
          )}
        </button>
      </div>
    );
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Connected Button */}
      <button
        onClick={() => setDropdownOpen(!dropdownOpen)}
        className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 text-white font-medium text-sm transition-all duration-200 active:scale-[0.98] cursor-pointer"
      >
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        <span className="font-mono text-white/90">{displayAddress}</span>
        {balance !== null && (
          <span className="text-white/40 text-xs border-l border-white/10 pl-2">
            {parseFloat(balance).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} XLM
          </span>
        )}
        <ChevronDown
          className={`w-4 h-4 text-white/50 transition-transform duration-300 ${
            dropdownOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* Animated Dropdown */}
      <AnimatePresence>
        {dropdownOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="absolute right-0 mt-3 w-80 rounded-2xl border border-white/10 bg-[#111118]/95 backdrop-blur-xl p-5 shadow-2xl z-50 overflow-hidden"
          >
            {/* Wallet Info */}
            <div className="flex flex-col gap-4">
              {/* Address Header */}
              <div className="flex items-center justify-between">
                <span className="text-xs text-white/40 font-medium tracking-wide uppercase">
                  Connected Wallet
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border border-sky-500/20 bg-sky-500/10 text-[10px] text-sky-400 font-semibold tracking-wide uppercase">
                  Testnet
                </span>
              </div>

              {/* Display Address & Copy button */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5">
                <span className="font-mono text-sm text-white/80 break-all select-all select-none">
                  {address}
                </span>
                <button
                  onClick={handleCopy}
                  className="p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 text-white/60 hover:text-white transition-colors duration-150 cursor-pointer"
                  title="Copy Address"
                >
                  {copied ? (
                    <Check className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>

              {/* Balance display */}
              <div className="flex flex-col gap-1 p-3 rounded-xl bg-white/5 border border-white/5">
                <span className="text-xs text-white/40 font-medium">XLM Balance</span>
                <div className="flex items-baseline justify-between mt-1">
                  <span className="text-2xl font-bold text-white">
                    {balance !== null
                      ? parseFloat(balance).toLocaleString(undefined, {
                          minimumFractionDigits: 4,
                          maximumFractionDigits: 4,
                        })
                      : "—"}
                  </span>
                  <span className="text-sm font-semibold text-white/40">XLM</span>
                </div>
                {balance === "0" && (
                  <span className="text-[10px] text-amber-400 mt-1 flex items-center gap-1">
                    <Disc className="w-3 h-3 fill-current" />
                    Account unfunded on Testnet
                  </span>
                )}
              </div>

              {/* Actions */}
              <div className="grid grid-cols-2 gap-2.5 pt-2 border-t border-white/5">
                <a
                  href={`https://stellar.expert/explorer/testnet/account/${address}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 text-white/80 hover:text-white text-xs font-semibold transition-colors duration-150 no-underline"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Explorer
                </a>
                <button
                  onClick={() => {
                    setDropdownOpen(false);
                    disconnect();
                  }}
                  className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl border border-rose-500/10 bg-rose-500/5 hover:bg-rose-500/10 text-rose-400 hover:text-rose-300 text-xs font-semibold transition-colors duration-150 cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Disconnect
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
