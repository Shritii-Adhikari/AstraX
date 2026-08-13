"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useGlobalWallet } from "@/context/WalletContext";
import { X, ArrowRight, Wallet, Loader2, CheckCircle2, AlertTriangle, ExternalLink, RefreshCw } from "lucide-react";

interface SendModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type Step = "input" | "review" | "loading" | "success" | "error";

export default function SendModal({ isOpen, onClose }: SendModalProps) {
  const { address, balance, sendXlm, refreshBalance } = useGlobalWallet();

  const [to, setTo] = useState("");
  const [amount, setAmount] = useState("");
  const [step, setStep] = useState<Step>("input");
  const [loadingText, setLoadingText] = useState("");
  const [txHash, setTxHash] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  
  // Validation errors
  const [toError, setToError] = useState("");
  const [amountError, setAmountError] = useState("");

  const validateInput = () => {
    let valid = true;

    // Validate Stellar address format (starts with G, length 56)
    if (!to.trim()) {
      setToError("Destination address is required");
      valid = false;
    } else if (!/^G[A-Z2-7]{55}$/.test(to.trim())) {
      setToError("Invalid Stellar public key address");
      valid = false;
    } else {
      setToError("");
    }

    // Validate amount
    const amtNum = parseFloat(amount);
    if (!amount) {
      setAmountError("Amount is required");
      valid = false;
    } else if (isNaN(amtNum) || amtNum <= 0) {
      setAmountError("Amount must be greater than 0");
      valid = false;
    } else if (balance && amtNum > parseFloat(balance) - 0.01) {
      setAmountError(`Insufficient balance (need amount + 0.01 XLM fee)`);
      valid = false;
    } else {
      setAmountError("");
    }

    return valid;
  };

  const handleNext = () => {
    if (validateInput()) {
      setStep("review");
    }
  };

  const handleConfirm = async () => {
    setStep("loading");
    setLoadingText("Waiting for wallet signature...");
    
    try {
      // Step 1: Sign & Submit Transaction via useGlobalWallet
      // We will update the text as Freighter transitions to network submission
      // Wait, freighter signature will trigger a popup. We wait for it:
      const submitPromise = sendXlm(to.trim(), amount.trim());
      
      // Since sendXlm does build -> sign -> submit, we can update the loader text
      // after a brief delay which typically represents signature success and start of submission.
      const timer = setTimeout(() => {
        setLoadingText("Submitting to Stellar Horizon testnet...");
      }, 3500);

      const result = await submitPromise;
      clearTimeout(timer);
      
      setTxHash(result.hash);
      setStep("success");
      
      // Auto refresh balance
      await refreshBalance();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
      setStep("error");
    }
  };

  const handleReset = () => {
    setTo("");
    setAmount("");
    setStep("input");
    setErrorMsg("");
    setTxHash("");
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleClose}
          className="absolute inset-0 bg-[#06060a]/80 backdrop-blur-md"
        />

        {/* Modal content wrapper */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ type: "spring", duration: 0.4 }}
          className="relative w-full max-w-md rounded-3xl border border-white/10 bg-[#111118]/95 backdrop-blur-xl p-6 shadow-2xl overflow-hidden z-10"
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/5">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Wallet className="w-5 h-5 text-[#3D81E3]" />
              Send XLM
            </h3>
            <button
              onClick={handleClose}
              className="p-1 rounded-full hover:bg-white/5 border border-transparent hover:border-white/10 text-white/50 hover:text-white transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Stepper Content */}
          <div className="min-height-[240px]">
            {step === "input" && (
              <div className="flex flex-col gap-4">
                {/* Balance display */}
                <div className="text-right">
                  <span className="text-xs text-white/40 font-medium">Available: </span>
                  <span className="text-xs font-semibold text-white/80">
                    {balance ? parseFloat(balance).toFixed(4) : "0.00"} XLM
                  </span>
                </div>

                {/* Destination input */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-white/50 font-semibold tracking-wide uppercase">
                    Recipient Address
                  </label>
                  <input
                    type="text"
                    value={to}
                    onChange={(e) => {
                      setTo(e.target.value);
                      if (toError) setToError("");
                    }}
                    placeholder="G..."
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 font-mono text-sm text-white placeholder-white/20 focus:border-[#3D81E3] focus:outline-none transition-colors"
                    spellCheck={false}
                  />
                  {toError && <span className="text-xs text-rose-400 mt-1">{toError}</span>}
                </div>

                {/* Amount input */}
                <div className="flex flex-col gap-1.5 mt-2">
                  <label className="text-xs text-white/50 font-semibold tracking-wide uppercase">
                    Amount (XLM)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={amount}
                      onChange={(e) => {
                        setAmount(e.target.value);
                        if (amountError) setAmountError("");
                      }}
                      placeholder="0.0"
                      step="any"
                      min="0"
                      inputMode="decimal"
                      className="w-full bg-white/5 border border-white/10 rounded-xl pl-4 pr-16 py-3 font-semibold text-white placeholder-white/20 focus:border-[#3D81E3] focus:outline-none transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (balance) {
                          // Leave a tiny fraction for transaction fee (0.01 XLM)
                          const maxAmount = Math.max(0, parseFloat(balance) - 0.011);
                          setAmount(maxAmount.toString());
                        }
                      }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 border border-white/5 text-white/80 hover:text-white text-[10px] font-bold uppercase transition-colors cursor-pointer"
                    >
                      Max
                    </button>
                  </div>
                  {amountError && <span className="text-xs text-rose-400 mt-1">{amountError}</span>}
                </div>

                {/* Next CTA */}
                <button
                  onClick={handleNext}
                  className="w-full mt-6 flex items-center justify-center gap-1.5 py-3.5 rounded-full bg-white text-black font-semibold text-sm hover:bg-white/90 active:scale-[0.98] transition-all cursor-pointer"
                >
                  <span>Review Transaction</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {step === "review" && (
              <div className="flex flex-col gap-5">
                {/* Transaction details card */}
                <div className="flex flex-col gap-3.5 p-4 rounded-2xl bg-white/5 border border-white/5">
                  <div className="flex justify-between items-baseline">
                    <span className="text-xs text-white/40">Amount</span>
                    <span className="text-xl font-bold text-white">{amount} XLM</span>
                  </div>
                  <div className="border-t border-white/5 pt-3 flex flex-col gap-1.5">
                    <span className="text-xs text-white/40">Recipient</span>
                    <span className="font-mono text-xs text-white/80 break-all">{to}</span>
                  </div>
                  <div className="border-t border-white/5 pt-3 flex justify-between">
                    <span className="text-xs text-white/40">Estimated Fee</span>
                    <span className="text-xs font-semibold text-white/70">0.01 XLM</span>
                  </div>
                  <div className="border-t border-white/5 pt-3 flex justify-between">
                    <span className="text-xs text-white/40">Network</span>
                    <span className="text-xs font-semibold text-sky-400">Stellar Testnet</span>
                  </div>
                </div>

                {/* Review CTAs */}
                <div className="flex gap-3 mt-4">
                  <button
                    onClick={() => setStep("input")}
                    className="flex-1 py-3.5 rounded-full border border-white/10 hover:bg-white/5 text-white font-semibold text-sm transition-colors cursor-pointer"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleConfirm}
                    className="flex-1 py-3.5 rounded-full bg-[#3D81E3] hover:bg-[#3D81E3]/90 text-white font-semibold text-sm hover:shadow-lg active:scale-[0.98] transition-all cursor-pointer"
                  >
                    Confirm & Send
                  </button>
                </div>
              </div>
            )}

            {step === "loading" && (
              <div className="flex flex-col items-center justify-center py-8 gap-4 text-center">
                <Loader2 className="w-12 h-12 animate-spin text-[#3D81E3]" />
                <div className="flex flex-col gap-1">
                  <h4 className="text-base font-bold text-white">Processing Transaction</h4>
                  <p className="text-sm text-white/50">{loadingText}</p>
                </div>
              </div>
            )}

            {step === "success" && (
              <div className="flex flex-col gap-5">
                {/* Icon */}
                <div className="flex flex-col items-center justify-center py-4 gap-2 text-center">
                  <CheckCircle2 className="w-16 h-16 text-emerald-400" />
                  <h4 className="text-lg font-bold text-white">Transaction Successful</h4>
                  <span className="text-2xl font-extrabold text-emerald-400 mt-1">
                    -{amount} XLM
                  </span>
                </div>

                {/* Details list */}
                <div className="flex flex-col gap-3 p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/10 text-sm">
                  <div className="flex justify-between">
                    <span className="text-white/40 text-xs">Receiver</span>
                    <span className="font-mono text-xs text-white/80 max-w-[200px] break-all text-right">
                      {to}
                    </span>
                  </div>
                  <div className="flex justify-between items-center border-t border-white/5 pt-2.5">
                    <span className="text-white/40 text-xs">Hash</span>
                    <a
                      href={`https://stellar.expert/explorer/testnet/tx/${txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono text-xs text-[#3D81E3] hover:underline flex items-center gap-1"
                    >
                      {txHash.slice(0, 6)}...{txHash.slice(-6)}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                  <div className="flex justify-between border-t border-white/5 pt-2.5">
                    <span className="text-white/40 text-xs">Network</span>
                    <span className="text-white/80 text-xs">Stellar Testnet</span>
                  </div>
                  <div className="flex justify-between border-t border-white/5 pt-2.5">
                    <span className="text-white/40 text-xs">Timestamp</span>
                    <span className="text-white/80 text-xs">
                      {new Date().toLocaleTimeString()}
                    </span>
                  </div>
                </div>

                {/* Success CTA */}
                <button
                  onClick={handleClose}
                  className="w-full mt-4 py-3.5 rounded-full bg-white text-black font-semibold text-sm hover:bg-white/90 active:scale-[0.98] transition-all cursor-pointer"
                >
                  Done
                </button>
              </div>
            )}

            {step === "error" && (
              <div className="flex flex-col gap-5">
                {/* Icon */}
                <div className="flex flex-col items-center justify-center py-4 gap-2 text-center">
                  <AlertTriangle className="w-16 h-16 text-rose-400" />
                  <h4 className="text-lg font-bold text-white">Transaction Failed</h4>
                  <p className="text-sm text-rose-300 max-w-sm mt-1">
                    {errorMsg || "An unknown Stellar transaction error occurred."}
                  </p>
                </div>

                {/* Error CTAs */}
                <div className="flex gap-3 mt-4">
                  <button
                    onClick={handleClose}
                    className="flex-1 py-3.5 rounded-full border border-white/10 hover:bg-white/5 text-white font-semibold text-sm transition-colors cursor-pointer"
                  >
                    Close
                  </button>
                  <button
                    onClick={handleReset}
                    className="flex-1 py-3.5 rounded-full bg-rose-500 hover:bg-rose-600 text-white font-semibold text-sm flex items-center justify-center gap-1.5 hover:shadow-lg active:scale-[0.98] transition-all cursor-pointer"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Retry
                  </button>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
