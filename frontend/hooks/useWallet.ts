"use client";

import { useCallback } from "react";
import { useGlobalWallet } from "@/context/WalletContext";

export function useWallet() {
  const { address, connect, disconnect, isLoading } = useGlobalWallet();

  const sign = useCallback(
    async (txXdr: string): Promise<string> => {
      if (!address) throw new Error("Wallet not connected");
      const { signTx } = await import("@/lib/stellar-wallet");
      return signTx(txXdr, address);
    },
    [address]
  );

  const connectWithReturn = useCallback(async () => {
    await connect();
    return address;
  }, [connect, address]);

  return {
    address,
    connect: connectWithReturn,
    sign,
    disconnect,
    connecting: isLoading,
  };
}
