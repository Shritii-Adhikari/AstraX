"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import WalletButton from "@/components/WalletButton";
import { Menu, X } from "lucide-react";

export function LogoMark({ className = "w-5 h-5", size }: { className?: string; size?: number }) {
  const style = size ? { width: size, height: size } : undefined;
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={style}
    >
      {/* Planet Ring & Orbit */}
      <ellipse cx="24" cy="24" rx="20" ry="7" stroke="currentColor" strokeWidth="3" transform="rotate(-25 24 24)" />
      <circle cx="24" cy="24" r="11" fill="currentColor" />
      <path d="M 9 27 C 12 33 21 37 31 34" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/swap", label: "Swap" },
  { href: "/liquidity", label: "Liquidity" },
  { href: "/portfolio", label: "Portfolio" },
];

export default function Navbar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isLinkActive = (path: string) => {
    if (path === "/") return pathname === "/";
    return pathname.startsWith(path);
  };

  return (
    <header className="fixed top-5 left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-[960px]">
      <motion.nav
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full bg-[#18181b]/90 backdrop-blur-xl border border-white/15 rounded-full p-2.5 shadow-[0_12px_40px_rgba(0,0,0,0.6)] flex items-center justify-between transition-all"
      >
        {/* Left: White Circle Planet Logo */}
        <Link
          href="/"
          className="w-11 h-11 rounded-full bg-white flex items-center justify-center text-black shrink-0 hover:scale-105 transition-transform duration-200 shadow-md group cursor-pointer"
          title="AstraX Home"
        >
          <LogoMark className="w-6 h-6 text-black group-hover:rotate-12 transition-transform duration-300" />
        </Link>

        {/* Center: Desktop Navigation Links */}
        <div className="hidden md:flex items-center gap-6 lg:gap-8 px-4">
          {NAV_LINKS.map((link) => {
            const active = isLinkActive(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className="relative text-sm font-medium transition-colors duration-200 cursor-pointer no-underline"
                style={{
                  color: active ? "#ffffff" : "rgba(255, 255, 255, 0.7)",
                  fontWeight: active ? 600 : 500,
                }}
              >
                {link.label}
                {active && (
                  <motion.div
                    layoutId="active-pill-dot"
                    className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-white"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
                  />
                )}
              </Link>
            );
          })}
        </div>

        {/* Right: Action Pill (Wallet Button) */}
        <div className="hidden sm:flex items-center gap-2">
          <WalletButton />
        </div>

        {/* Mobile Hamburger Toggle Button */}
        <div className="flex items-center gap-2 sm:hidden">
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="w-10 h-10 rounded-full bg-white/10 border border-white/10 flex items-center justify-center text-white active:scale-95 transition-transform cursor-pointer"
            aria-label="Toggle Menu"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </motion.nav>

      {/* Mobile Menu Dropdown */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={{ duration: 0.2 }}
            className="mt-3 p-4 rounded-3xl bg-[#18181b]/95 border border-white/15 backdrop-blur-2xl shadow-2xl flex flex-col gap-2 overflow-hidden"
          >
            {NAV_LINKS.map((link) => {
              const active = isLinkActive(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className="px-4 py-3 rounded-2xl flex items-center justify-between text-base font-medium transition-colors no-underline"
                  style={{
                    color: active ? "#ffffff" : "rgba(255, 255, 255, 0.7)",
                    background: active ? "rgba(255, 255, 255, 0.1)" : "transparent",
                  }}
                >
                  <span>{link.label}</span>
                  {active && <span className="w-2 h-2 rounded-full bg-white" />}
                </Link>
              );
            })}
            <div className="pt-3 border-t border-white/10 flex justify-center">
              <WalletButton />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
