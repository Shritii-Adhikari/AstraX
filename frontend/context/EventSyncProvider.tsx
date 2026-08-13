"use client";

import React, { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getLatestLedger, getRpc } from "@/lib/stellar";
import { POOL_ADDRESS, PM_ADDRESS, PROFILE_CONTRACT_ADDRESS } from "@/lib/stellar/contracts";

export function EventSyncProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const lastLedgerRef = useRef<number>(0);
  const processedEventIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    let active = true;
    let timer: NodeJS.Timeout;

    // 1. Initialize starting ledger
    const initLedger = async () => {
      try {
        const latest = await getLatestLedger();
        lastLedgerRef.current = latest;
        console.log(`[EventSync] Listening started from ledger #${latest}`);
      } catch (err) {
        console.error("[EventSync] Failed to fetch latest ledger on init, retrying...", err);
      }
    };

    // 2. Main polling function
    const pollEvents = async () => {
      if (lastLedgerRef.current === 0) {
        await initLedger();
        if (active) timer = setTimeout(pollEvents, 4000);
        return;
      }

      try {
        const server = getRpc();
        const startLedger = lastLedgerRef.current;

        // Query events from startLedger (inclusive)
        const response = await server.getEvents({
          startLedger,
          filters: [
            {
              type: "contract",
              contractIds: [
                POOL_ADDRESS,
                PM_ADDRESS,
                PROFILE_CONTRACT_ADDRESS,
              ].filter(Boolean),
            },
          ],
          limit: 30,
        });

        if (!active) return;

        const events = response.events || [];
        let maxLedgerSeen = startLedger;

        if (events.length > 0) {
          let triggerPoolState = false;
          let triggerBalances = false;
          let triggerPositions = false;
          let triggerProfile = false;

          for (const ev of events) {
            // Deduplicate
            if (processedEventIdsRef.current.has(ev.id)) continue;
            processedEventIdsRef.current.add(ev.id);
            // Cap set size
            if (processedEventIdsRef.current.size > 200) {
              const items = Array.from(processedEventIdsRef.current);
              processedEventIdsRef.current = new Set(items.slice(-100));
            }

            maxLedgerSeen = Math.max(maxLedgerSeen, ev.ledger);
            const contractId = ev.contractId?.contractId();

            console.log(`[EventSync] Event detected on contract ${contractId} in ledger #${ev.ledger}`);

            if (contractId === POOL_ADDRESS) {
              triggerPoolState = true;
              triggerBalances = true;
              triggerPositions = true;
            } else if (contractId === PM_ADDRESS) {
              triggerPositions = true;
              triggerBalances = true;
            } else if (contractId === PROFILE_CONTRACT_ADDRESS) {
              triggerProfile = true;
            }
          }

          // Trigger state refreshes by invalidating react-query caches
          if (triggerPoolState) {
            console.log("[EventSync] Invalidate pool-state query cache");
            queryClient.invalidateQueries({ queryKey: ["pool-state"] });
          }
          if (triggerBalances) {
            console.log("[EventSync] Invalidate balances query cache");
            queryClient.invalidateQueries({ queryKey: ["balances"] });
          }
          if (triggerPositions) {
            console.log("[EventSync] Invalidate positions query cache");
            queryClient.invalidateQueries({ queryKey: ["positions"] });
          }
          if (triggerProfile) {
            console.log("[EventSync] Invalidate user-profile query cache");
            queryClient.invalidateQueries({ queryKey: ["user-profile"] });
          }

          // Move cursor to the ledger after the highest one processed
          lastLedgerRef.current = maxLedgerSeen + 1;
        } else {
          // If no events, check latest ledger to avoid lagging behind too far
          const latest = await getLatestLedger();
          if (latest > lastLedgerRef.current) {
            // Keep up with latest sequence, leaving room for safety (last ledger - 1)
            lastLedgerRef.current = latest - 1;
          }
        }
      } catch (err) {
        console.error("[EventSync] Error in polling loop:", err);
      }

      if (active) {
        timer = setTimeout(pollEvents, 4000);
      }
    };

    pollEvents();

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [queryClient]);

  return <>{children}</>;
}
