"use client";

import { useState, useEffect, useCallback } from "react";
import {
  detectFreighter,
  connectWallet,
  getWalletAddress,
  signTx,
} from "@/lib/stellar-wallet";
import {
  fetchXlmBalance,
  buildPaymentXdr,
  submitSignedTx,
} from "@/lib/stellar-payments";

/** Map Stellar errors to readable messages. */
export function errMessage(err: unknown): string {
  const e = err as {
    message?: string;
    response?: { data?: { extras?: { result_codes?: unknown } } };
  };
  const codes = e?.response?.data?.extras?.result_codes;
  if (codes) return `Transaction failed: ${JSON.stringify(codes)}`;
  if (e?.message) return e.message;
  return String(err);
}

export interface UseStellarWallet {
  address: string | null;
  balance: string | null;
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
  /** null = detection pending, false = not installed, true = available */
  hasFreighter: boolean | null;
  walletId: string | null;
  isModalOpen: boolean;
  setIsModalOpen: (open: boolean) => void;
  connect: (id?: "freighter" | "albedo" | "xbull" | "lobstr") => Promise<void>;
  disconnect: () => void;
  refreshBalance: () => Promise<void>;
  sendXlm: (to: string, amount: string) => Promise<{ hash: string }>;
}

export function useStellarWallet(): UseStellarWallet {
  const [address, setAddress] = useState<string | null>(null);
  const [walletId, setWalletId] = useState<string | null>(null);
  const [balance, setBalance] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasFreighter, setHasFreighter] = useState<boolean | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const loadBalance = useCallback(async (addr: string) => {
    const bal = await fetchXlmBalance(addr);
    setBalance(bal);
  }, []);

  // Restore session and detect Freighter on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const detected = await detectFreighter();
      if (cancelled) return;
      setHasFreighter(detected);

      const session = await getWalletAddress();
      if (cancelled) return;

      if (session.address && session.walletId) {
        setAddress(session.address);
        setWalletId(session.walletId);
        try {
          await loadBalance(session.address);
        } catch (e) {
          if (!cancelled) setError(errMessage(e));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadBalance]);

  const connect = useCallback(
    async (id?: "freighter" | "albedo" | "xbull" | "lobstr") => {
      // If no wallet ID specified, open the selection modal
      if (!id) {
        setIsModalOpen(true);
        return;
      }

      setIsLoading(true);
      setError(null);
      try {
        if (id === "freighter") {
          const freighterInstalled = await detectFreighter();
          if (!freighterInstalled) {
            throw new Error("Freighter not detected. Please install it from freighter.app.");
          }
        }

        const addr = await connectWallet(id);
        setAddress(addr);
        setWalletId(id);
        setIsModalOpen(false); // close modal on success
        await loadBalance(addr);
      } catch (e) {
        setError(errMessage(e));
        throw e;
      } finally {
        setIsLoading(false);
      }
    },
    [loadBalance]
  );

  const disconnect = useCallback(() => {
    localStorage.removeItem("selectedWalletId");
    setAddress(null);
    setWalletId(null);
    setBalance(null);
    setError(null);
  }, []);

  const refreshBalance = useCallback(async () => {
    if (!address) return;
    setIsLoading(true);
    setError(null);
    try {
      await loadBalance(address);
    } catch (e) {
      setError(errMessage(e));
    } finally {
      setIsLoading(false);
    }
  }, [address, loadBalance]);

  const sendXlm = useCallback(
    async (to: string, amount: string): Promise<{ hash: string }> => {
      if (!address) throw new Error("Connect your wallet first");
      setIsLoading(true);
      setError(null);
      try {
        const xdr = await buildPaymentXdr(address, to, amount);
        const signed = await signTx(xdr, address);
        const result = await submitSignedTx(signed);
        await loadBalance(address);
        return result;
      } catch (e) {
        const message = errMessage(e);
        setError(message);
        throw new Error(message);
      } finally {
        setIsLoading(false);
      }
    },
    [address, loadBalance]
  );

  return {
    address,
    balance,
    isConnected: !!address,
    isLoading,
    error,
    hasFreighter,
    walletId,
    isModalOpen,
    setIsModalOpen,
    connect,
    disconnect,
    refreshBalance,
    sendXlm,
  };
}
