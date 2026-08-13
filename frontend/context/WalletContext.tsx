"use client";

import React, { createContext, useContext } from "react";
import { useStellarWallet, UseStellarWallet } from "@/hooks/use-stellar-wallet";

const WalletContext = createContext<UseStellarWallet | undefined>(undefined);

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const wallet = useStellarWallet();

  return (
    <WalletContext.Provider value={wallet}>
      {children}
    </WalletContext.Provider>
  );
}

export function useGlobalWallet() {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error("useGlobalWallet must be used within a WalletProvider");
  }
  return context;
}
