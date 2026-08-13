"use client";

import { ChevronDown } from "lucide-react";

interface Token {
  symbol: string;
  name: string;
  logo: string;
}

interface Props {
  token: Token;
  value: string;
  onChange?: (v: string) => void;
  readOnly?: boolean;
  label: string;
  usdValue?: string;
  loading?: boolean;
}

export default function TokenInputBox({
  token,
  value,
  onChange,
  readOnly = false,
  label,
  usdValue,
  loading,
}: Props) {
  return (
    <div
      className="p-5 sm:p-6 rounded-[24px] bg-white/[0.03] border border-white/[0.08] transition-all hover:border-white/15"
    >
      <p className="text-xs font-semibold uppercase tracking-wider text-white/50 mb-3">
        {label}
      </p>

      <div className="flex items-center justify-between gap-4">
        {/* Input & USD value */}
        <div className="min-w-0 flex-1">
          {loading ? (
            <div className="flex items-center h-12">
              <div className="spinner w-5 h-5" />
            </div>
          ) : (
            <input
              type="text"
              inputMode="decimal"
              placeholder="0"
              value={value}
              onChange={(e) => onChange?.(e.target.value)}
              readOnly={readOnly}
              className="w-full bg-transparent border-none outline-none text-white text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight font-instrument"
            />
          )}
          <p className="text-white/40 text-xs sm:text-sm mt-1">
            ${usdValue ?? "0.00"}
          </p>
        </div>

        {/* Token Pill */}
        <div className="flex items-center gap-2.5 bg-white/[0.06] border border-white/10 hover:border-white/20 rounded-full px-3.5 py-2 shrink-0 select-none shadow-md">
          <img
            src={token.logo}
            alt={token.symbol}
            className="w-7 h-7 rounded-full object-contain shrink-0"
          />
          <span className="text-white font-bold text-base sm:text-lg">
            {token.symbol}
          </span>
          <ChevronDown size={16} className="text-white/50 ml-0.5" />
        </div>
      </div>
    </div>
  );
}
