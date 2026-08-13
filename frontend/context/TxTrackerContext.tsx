"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { parseStellarError, StellarError, HorizonErrorResponse } from "@/lib/errors";
import { getLatestLedger } from "@/lib/stellar";

export type TxStep =
  | "idle"
  | "preparing"
  | "waiting_signature"
  | "submitting"
  | "pending"
  | "confirmed"
  | "failed";

export interface TxTrackerState {
  step: TxStep;
  txHash: string | null;
  ledger: number | null;
  error: StellarError | null;
  title: string;
}

interface TxTrackerContextType {
  state: TxTrackerState;
  isModalOpen: boolean;
  closeModal: () => void;
  trackTx: (
    actionName: string,
    txExecutionFn: (updateStep: (step: TxStep) => void) => Promise<{ hash: string; ledger?: number; id?: string } | void | null>
  ) => Promise<void>;
  retryTx: () => void;
}

const TxTrackerContext = createContext<TxTrackerContextType | undefined>(undefined);

export function TxTrackerProvider({ children }: { children: React.ReactNode }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [state, setState] = useState<TxTrackerState>({
    step: "idle",
    txHash: null,
    ledger: null,
    error: null,
    title: "",
  });

  // Keep a reference to the active transaction execution function for retry
  const [activeTx, setActiveTx] = useState<{
    actionName: string;
    fn: (updateStep: (step: TxStep) => void) => Promise<{ hash: string; ledger?: number; id?: string } | void | null>;
  } | null>(null);

  const closeModal = useCallback(() => {
    // Only allow closing if confirmed or failed
    if (state.step === "confirmed" || state.step === "failed" || state.step === "idle") {
      setIsModalOpen(false);
      setState({
        step: "idle",
        txHash: null,
        ledger: null,
        error: null,
        title: "",
      });
    }
  }, [state.step]);

  const trackTx = useCallback(
    async (
      actionName: string,
      txExecutionFn: (updateStep: (step: TxStep) => void) => Promise<{ hash: string; ledger?: number; id?: string } | void | null>
    ) => {
      setIsModalOpen(true);
      setActiveTx({ actionName, fn: txExecutionFn });
      setState({
        step: "preparing",
        txHash: null,
        ledger: null,
        error: null,
        title: actionName,
      });

      const updateStep = (nextStep: TxStep) => {
        setState((prev) => ({ ...prev, step: nextStep }));
      };

      try {
        const result = await txExecutionFn(updateStep);
        
        let ledgerSeq = result?.ledger || null;
        if (!ledgerSeq && result?.hash) {
          try {
            ledgerSeq = await getLatestLedger();
          } catch {
            // fallback
          }
        }

        setState({
          step: "confirmed",
          txHash: result?.hash || result?.id || null,
          ledger: ledgerSeq,
          error: null,
          title: actionName,
        });
      } catch (err) {
        console.error("Transaction failed in tracker:", err);
        const parsed = parseStellarError(err as Error | HorizonErrorResponse);
        setState((prev) => ({
          ...prev,
          step: "failed",
          error: parsed,
        }));
      }
    },
    []
  );

  const retryTx = useCallback(async () => {
    if (!activeTx) return;
    await trackTx(activeTx.actionName, activeTx.fn);
  }, [activeTx, trackTx]);

  return (
    <TxTrackerContext.Provider
      value={{
        state,
        isModalOpen,
        closeModal,
        trackTx,
        retryTx,
      }}
    >
      {children}
    </TxTrackerContext.Provider>
  );
}

export function useTxTracker() {
  const context = useContext(TxTrackerContext);
  if (context === undefined) {
    throw new Error("useTxTracker must be used within a TxTrackerProvider");
  }
  return context;
}
