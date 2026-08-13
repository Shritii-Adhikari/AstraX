"use client";

import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { useTxTracker, TxStep } from "@/context/TxTrackerContext";
import { 
  X, 
  Loader2, 
  Check, 
  AlertTriangle, 
  ExternalLink, 
  FileText,
  RefreshCw
} from "lucide-react";

interface StepConfig {
  id: TxStep;
  label: string;
  description: string;
}

const STEPS: StepConfig[] = [
  {
    id: "preparing",
    label: "Preparing Transaction",
    description: "Simulating on-chain and estimating fees",
  },
  {
    id: "waiting_signature",
    label: "Waiting for Signature",
    description: "Please approve the request in your wallet extension",
  },
  {
    id: "submitting",
    label: "Submitting to Network",
    description: "Sending transaction XDR to Stellar Testnet RPC",
  },
  {
    id: "pending",
    label: "Pending Consensus",
    description: "Waiting for Stellar validators to close the ledger",
  },
];

export default function TxStatusModal() {
  const { state, isModalOpen, closeModal, retryTx } = useTxTracker();
  const { step, txHash, ledger, error, title } = state;

  if (!isModalOpen || step === "idle") return null;

  const isCompleted = step === "confirmed";
  const isFailed = step === "failed";
  const isPending = !isCompleted && !isFailed;

  // Determine active step index
  let activeIndex = 0;
  if (step === "waiting_signature") activeIndex = 1;
  if (step === "submitting") activeIndex = 2;
  if (step === "pending") activeIndex = 3;
  if (isCompleted) activeIndex = 4;
  if (isFailed) activeIndex = activeIndex; // hold index on fail

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={closeModal}
          className="absolute inset-0 bg-black/70 backdrop-blur-md"
        />

        {/* Modal Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 16 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="relative w-full max-w-[440px] rounded-[30px] border border-white/10 bg-[#0d0b14]/95 p-6 shadow-2xl overflow-hidden z-10"
        >
          {/* Background Glows */}
          {isCompleted && (
            <div className="absolute -top-24 -left-24 w-52 h-52 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
          )}
          {isFailed && (
            <div className="absolute -top-24 -left-24 w-52 h-52 rounded-full bg-rose-500/10 blur-3xl pointer-events-none" />
          )}
          {isPending && (
            <div className="absolute -top-24 -left-24 w-52 h-52 rounded-full bg-[#3D81E3]/10 blur-3xl pointer-events-none" />
          )}

          {/* Close Button */}
          {(isCompleted || isFailed) && (
            <button
              onClick={closeModal}
              className="absolute top-5 right-5 p-1.5 rounded-full hover:bg-white/10 border border-white/5 text-white/40 hover:text-white transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          {/* Title / Action */}
          <div className="mb-6">
            <span className="text-[10px] uppercase font-bold tracking-wider text-white/30">Transaction status</span>
            <h4 className="text-lg font-bold text-white mt-0.5 leading-tight">{title || "Transaction"}</h4>
          </div>

          {/* Stepper (Only show if not failed, or show alongside error) */}
          <div className="flex flex-col gap-4">
            {STEPS.map((s, idx) => {
              const isStepDone = idx < activeIndex || isCompleted;
              const isStepActive = idx === activeIndex && isPending;
              const isStepPending = idx > activeIndex && !isCompleted;

              let icon = (
                <div className="w-5 h-5 rounded-full border border-white/10 flex items-center justify-center text-[10px] text-white/30 font-semibold font-mono">
                  {idx + 1}
                </div>
              );

              if (isStepDone) {
                icon = (
                  <div className="w-5 h-5 rounded-full bg-emerald-500 text-black flex items-center justify-center">
                    <Check className="w-3 h-3 stroke-[3]" />
                  </div>
                );
              } else if (isStepActive) {
                icon = (
                  <div className="w-5 h-5 rounded-full border border-[#3D81E3] flex items-center justify-center">
                    <Loader2 className="w-3 h-3 animate-spin text-[#3D81E3]" />
                  </div>
                );
              }

              return (
                <div key={s.id} className="flex gap-4 items-start relative">
                  {/* Vertical connecting line */}
                  {idx < 3 && (
                    <div
                      className={`absolute left-[9px] top-6 w-[2px] h-[calc(100%-8px)] transition-colors duration-300 ${
                        idx < activeIndex || isCompleted
                          ? "bg-emerald-500"
                          : idx === activeIndex && isPending
                          ? "bg-gradient-to-b from-[#3D81E3] to-white/10"
                          : "bg-white/10"
                      }`}
                    />
                  )}

                  <div className="flex-shrink-0 mt-0.5">{icon}</div>
                  <div>
                    <span
                      className={`text-sm font-semibold block transition-colors ${
                        isStepDone
                          ? "text-white/80"
                          : isStepActive
                          ? "text-[#3D81E3]"
                          : "text-white/30"
                      }`}
                    >
                      {s.label}
                    </span>
                    {isStepActive && (
                      <motion.p
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        className="text-xs text-white/50 mt-1 leading-relaxed"
                      >
                        {s.description}
                      </motion.p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Success State Details */}
          {isCompleted && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-6 p-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 flex flex-col gap-3.5"
            >
              <div className="flex gap-2 items-center text-emerald-400 font-semibold text-sm">
                <Check className="w-4 h-4" />
                Transaction Confirmed!
              </div>

              {ledger && (
                <div className="flex items-center justify-between text-xs border-b border-white/5 pb-2">
                  <span className="text-white/40">Ledger</span>
                  <span className="text-white/70 font-mono font-medium">#{ledger}</span>
                </div>
              )}

              {txHash && (
                <div className="flex flex-col gap-1 text-xs">
                  <span className="text-white/40">Transaction Hash</span>
                  <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-white/5 border border-white/5">
                    <span className="font-mono text-white/70 truncate select-all">{txHash}</span>
                    <a
                      href={`https://stellar.expert/explorer/testnet/tx/${txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#3D81E3] hover:text-[#00d2ff] transition-colors p-1 flex-shrink-0"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* Failure State Details */}
          {isFailed && error && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-6 p-4 rounded-2xl border border-rose-500/25 bg-rose-500/5 flex flex-col gap-4"
            >
              <div className="flex gap-2 items-center text-rose-400 font-semibold text-sm">
                <AlertTriangle className="w-4 h-4" />
                {error.title}
              </div>

              <div className="text-xs text-white/70 leading-relaxed">
                {error.message}
              </div>

              <div className="text-xs p-2.5 rounded-xl bg-rose-950/20 border border-rose-500/10 text-white/50 leading-relaxed">
                <span className="font-bold text-rose-400/90 block mb-0.5 uppercase tracking-wide text-[9px]">Recovery steps</span>
                {error.recovery}
              </div>

              <button
                onClick={retryTx}
                className="flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl bg-white text-black hover:bg-white/90 active:scale-[0.98] transition-all font-semibold text-xs uppercase tracking-wider cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Retry Transaction
              </button>
            </motion.div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
