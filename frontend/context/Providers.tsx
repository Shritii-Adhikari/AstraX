"use client";

import React, { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WalletProvider } from "@/context/WalletContext";
import { ToastProvider } from "@/components/Toast";
import { TxTrackerProvider } from "@/context/TxTrackerContext";
import { EventSyncProvider } from "@/context/EventSyncProvider";

export default function Providers({ children }: { children: React.ReactNode }) {
  // Create the QueryClient once per session inside a useState initializer
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 20 * 1000,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <WalletProvider>
        <ToastProvider>
          <TxTrackerProvider>
            <EventSyncProvider>{children}</EventSyncProvider>
          </TxTrackerProvider>
        </ToastProvider>
      </WalletProvider>
    </QueryClientProvider>
  );
}
