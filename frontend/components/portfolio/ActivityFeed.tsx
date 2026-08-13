"use client";

import { useEffect, useState } from "react";
import { HORIZON_URL } from "@/lib/stellar/network";

interface HorizonEffect {
  id: string;
  type: string;
  created_at: string;
  [key: string]: unknown;
}

function formatType(type: string): string {
  return type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function ActivityFeed({ walletAddress }: { walletAddress: string }) {
  const [effects, setEffects] = useState<HorizonEffect[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!walletAddress) return;

    async function fetchEffects() {
      try {
        const url = `${HORIZON_URL}/accounts/${walletAddress}/effects?limit=20&order=desc`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json() as { _embedded: { records: HorizonEffect[] } };
        setEffects(data._embedded?.records ?? []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load activity");
      } finally {
        setLoading(false);
      }
    }

    fetchEffects();
  }, [walletAddress]);

  if (loading) {
    return (
      <div className="flex flex-col gap-2">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-14 rounded-xl bg-white/[0.03] border border-white/[0.06] animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-white/40 text-sm text-center py-6">
        Could not load activity: {error}
      </div>
    );
  }

  if (effects.length === 0) {
    return (
      <div className="text-white/40 text-sm text-center py-6">
        No recent activity found
      </div>
    );
  }

  const icons: Record<string, string> = {
    account_credited: "⬇",
    account_debited: "⬆",
    contract_credited: "💠",
    contract_debited: "💠",
    account_created: "✨",
  };

  return (
    <div className="w-full overflow-x-auto">
      <div className="flex flex-col gap-2 min-w-[300px]">
        {effects.map((effect) => {
          const assetCode = ("asset_code" in effect && effect.asset_code) ? String(effect.asset_code) : "XLM";
          const isUsdc = assetCode.toUpperCase() === "USDC";
          const iconSrc = isUsdc ? "/usdc.svg" : "/xlm.svg";

          return (
            <div
              key={effect.id}
              className="flex items-center justify-between gap-3 p-3 sm:p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:border-white/15 transition-all"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-lg shrink-0">
                  {icons[effect.type] ?? "⭕"}
                </span>
                <div className="min-w-0">
                  <p className="text-white font-semibold text-xs sm:text-sm truncate">
                    {formatType(effect.type)}
                  </p>
                  <p className="text-white/40 text-[11px]">
                    {timeAgo(effect.created_at)}
                  </p>
                </div>
              </div>
              {"amount" in effect && effect.amount ? (
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-white font-semibold text-xs sm:text-sm">
                    {String(effect.amount)}
                  </span>
                  <div className="flex items-center gap-1 bg-white/[0.06] border border-white/10 rounded-md px-2 py-0.5">
                    <img src={iconSrc} alt={assetCode} className="w-3.5 h-3.5 rounded-full object-contain" />
                    <span className="text-white/70 text-xs font-semibold">{assetCode}</span>
                  </div>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
