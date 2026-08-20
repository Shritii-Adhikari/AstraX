"use client";

import React from "react";
import Link from "next/link";

interface LogoProps {
  className?: string;
  size?: number;
}

export function LogoMark({ className = "w-8 h-8", size }: LogoProps) {
  const style = size ? { width: size, height: size } : undefined;
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={style}
    >
      <defs>
        <linearGradient id="astrax-logo-grad" x1="2" y1="2" x2="30" y2="30" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#48A7FF" />
          <stop offset="100%" stopColor="#1476FF" />
        </linearGradient>
      </defs>
      {/* 4-pointed stellar star */}
      <path
        d="M16 2.5L19.2 12.8L29.5 16L19.2 19.2L16 29.5L12.8 19.2L2.5 16L12.8 12.8L16 2.5Z"
        fill="url(#astrax-logo-grad)"
      />
      {/* Core highlight */}
      <circle cx="16" cy="16" r="2.5" fill="#FFFFFF" />
      {/* Precision corner ticks */}
      <path
        d="M8 8L10.5 10.5M24 24L21.5 21.5M24 8L21.5 10.5M8 24L10.5 21.5"
        stroke="#48A7FF"
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.8"
      />
    </svg>
  );
}

export function AstraxLogo({
  href = "/",
  markSize = 32,
  showText = true,
}: {
  href?: string;
  markSize?: number;
  showText?: boolean;
}) {
  return (
    <Link
      href={href}
      className="no-underline flex items-center gap-3 group cursor-pointer select-none"
    >
      <div className="relative flex items-center justify-center transition-transform duration-300 group-hover:scale-105">
        <LogoMark size={markSize} className="w-8 h-8" />
      </div>
      {showText && (
        <span className="font-semibold tracking-[0.2em] text-white text-sm md:text-[15px] uppercase">
          ASTRAX
        </span>
      )}
    </Link>
  );
}

export default AstraxLogo;
export const LuminaLogo = AstraxLogo;
