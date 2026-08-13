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
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={style}
    >
      <defs>
        <linearGradient id="lumina-primary-react" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#00D4FF" />
          <stop offset="50%" stopColor="#7C5CFF" />
          <stop offset="100%" stopColor="#E052FF" />
        </linearGradient>
        <radialGradient id="lumina-core-react" cx="24" cy="24" r="12" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#00D4FF" />
          <stop offset="100%" stopColor="#7C5CFF" />
        </radialGradient>
      </defs>

      {/* Outer Orbit Ring */}
      <circle cx="24" cy="24" r="21" stroke="url(#lumina-primary-react)" strokeWidth="2" strokeDasharray="85 30" opacity="0.9" />
      <circle cx="24" cy="24" r="16" stroke="url(#lumina-primary-react)" strokeWidth="1" strokeDasharray="40 20" opacity="0.4" transform="rotate(45 24 24)" />

      {/* Dual Swap Arcs */}
      <path d="M 24 8 A 16 16 0 0 1 40 24" stroke="url(#lumina-primary-react)" strokeWidth="3" strokeLinecap="round" />
      <polygon points="41,27 37,21 43,23" fill="#00D4FF" />

      <path d="M 24 40 A 16 16 0 0 1 8 24" stroke="url(#lumina-primary-react)" strokeWidth="3" strokeLinecap="round" />
      <polygon points="7,21 11,27 5,25" fill="#E052FF" />

      {/* Inner Liquid Diamond Core */}
      <path d="M 24 14 L 32 24 L 24 34 L 16 24 Z" fill="url(#lumina-core-react)" opacity="0.85" />
      <circle cx="24" cy="24" r="3.5" fill="#FFFFFF" />
    </svg>
  );
}

export default function LuminaLogo({ href = "/", markSize = 32, showText = true }: { href?: string; markSize?: number; showText?: boolean }) {
  return (
    <Link href={href} className="no-underline flex items-center gap-2.5 group cursor-pointer select-none">
      <div className="relative flex items-center justify-center transition-transform duration-300 group-hover:scale-105">
        <LogoMark size={markSize} className="w-8 h-8" />
      </div>
      {showText && (
        <span className="font-extrabold tracking-tight text-white text-lg flex items-center gap-0.5">
          <span>Lumina</span>
          <span
            style={{
              background: "linear-gradient(135deg, #00d4ff 0%, #7c5cff 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            DEX
          </span>
        </span>
      )}
    </Link>
  );
}
