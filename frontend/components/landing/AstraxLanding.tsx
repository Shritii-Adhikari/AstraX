"use client";

import React, { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import {
  ArrowUpRight,
  Menu,
  X,
  Layers,
  Zap,
  Shield,
  Sliders,
  TrendingUp,
  Cpu,
  Coins,
  Activity,
  CheckCircle2,
} from "lucide-react";
import WalletButton from "@/components/WalletButton";
import { LogoMark } from "@/components/AstraxLogo";

const NAV_LINKS = [
  { label: "SWAP", href: "/swap" },
  { label: "LIQUIDITY", href: "/liquidity" },
  { label: "PORTFOLIO", href: "/portfolio" },
  { label: "HOW IT WORKS", href: "#how-it-works" },
];

const PROTOCOL_METRICS = [
  {
    num: "01",
    label: "XLM / USDC",
    sublabel: "CORE PAIR",
  },
  {
    num: "02",
    label: "CLMM",
    sublabel: "LIQUIDITY MODEL",
  },
  {
    num: "03",
    label: "SOROBAN",
    sublabel: "SMART CONTRACTS",
  },
];

const HEADLINE_WORDS = ["CONCENTRATED", "LIQUIDITY", "REIMAGINED"];

export function AstraxLanding() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#050505] text-white selection:bg-[#1476FF]/30 selection:text-white font-sans overflow-x-hidden antialiased">
      {/* ============================================================ */}
      {/* 1. HERO VIEWPORT (100vh on Desktop)                          */}
      {/* ============================================================ */}
      <section className="relative min-h-screen flex flex-col justify-between overflow-hidden bg-[#050505]">
        {/* Full-Screen Video Background */}
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover pointer-events-none z-0"
          src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260517_222138_3e3205be-3364-417b-a64a-bfe087acbec4.mp4"
        />

        {/* Subtle dark ambient gradient overlay for optimal editorial contrast */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-black/20 to-[#050505] pointer-events-none z-[1]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(20,118,255,0.08)_0%,_transparent_65%)] pointer-events-none z-[1]" />

        {/* ----------------- ZONE 1: NAVBAR ----------------- */}
        <header className="relative z-20 w-full max-w-[1600px] mx-auto px-5 sm:px-8 md:px-12 pt-5 md:pt-7 flex items-center justify-between">
          {/* Left: AstraX Logo */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          >
            <Link
              href="/"
              className="flex items-center gap-3.5 no-underline group cursor-pointer select-none"
            >
              <div className="w-8 h-8 rounded-lg bg-black/60 border border-white/15 backdrop-blur-md flex items-center justify-center p-1 group-hover:border-[#1476FF]/60 group-hover:scale-105 transition-all duration-300 shadow-[0_0_15px_rgba(20,118,255,0.2)]">
                <LogoMark className="w-6 h-6 text-[#1476FF]" />
              </div>
              <span className="text-[13px] md:text-[15px] font-semibold tracking-[0.25em] text-white uppercase group-hover:text-white transition-colors">
                ASTRAX
              </span>
            </Link>
          </motion.div>

          {/* Center Navigation Links (Desktop) */}
          <nav className="hidden md:flex items-center gap-8 lg:gap-11">
            {NAV_LINKS.map((link, index) => (
              <motion.div
                key={link.label}
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.5,
                  delay: (index + 1) * 0.08,
                  ease: [0.22, 1, 0.36, 1],
                }}
              >
                <Link
                  href={link.href}
                  className="text-[12px] lg:text-[13px] font-medium tracking-[0.2em] text-white/70 hover:text-white transition-colors duration-200 uppercase relative group py-1"
                >
                  {link.label}
                  <span className="absolute bottom-0 left-0 w-0 h-[1.5px] bg-[#1476FF] transition-all duration-300 group-hover:w-full" />
                </Link>
              </motion.div>
            ))}
          </nav>

          {/* Right: Wallet Button & Mobile Toggle */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.5,
              delay: 0.4,
              ease: [0.22, 1, 0.36, 1],
            }}
            className="flex items-center gap-3"
          >
            <div className="hidden sm:block">
              <WalletButton />
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden w-10 h-10 rounded-full bg-black/60 border border-white/15 backdrop-blur-md flex items-center justify-center text-white hover:border-[#1476FF]/60 transition-colors cursor-pointer"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </motion.div>
        </header>

        {/* ----------------- MOBILE NAVIGATION OVERLAY ----------------- */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, backdropFilter: "blur(0px)" }}
              animate={{ opacity: 1, backdropFilter: "blur(24px)" }}
              exit={{ opacity: 0, backdropFilter: "blur(0px)" }}
              transition={{ duration: 0.25 }}
              className="fixed inset-0 z-50 bg-[#050505]/95 flex flex-col justify-between p-6 sm:p-8 md:hidden"
            >
              <div className="flex items-center justify-between">
                <Link
                  href="/"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3.5 no-underline"
                >
                  <div className="w-8 h-8 rounded-lg bg-black/60 border border-white/15 flex items-center justify-center p-1">
                    <LogoMark className="w-6 h-6 text-[#1476FF]" />
                  </div>
                  <span className="text-sm font-semibold tracking-[0.25em] text-white uppercase">
                    ASTRAX
                  </span>
                </Link>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-10 h-10 rounded-full bg-white/10 border border-white/10 flex items-center justify-center text-white"
                  aria-label="Close menu"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="flex flex-col gap-6 my-auto py-8">
                {NAV_LINKS.map((link, index) => (
                  <motion.div
                    key={link.label}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.08 }}
                  >
                    <Link
                      href={link.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className="text-2xl sm:text-3xl font-semibold tracking-[0.18em] text-white/90 hover:text-[#1476FF] uppercase transition-colors flex items-center justify-between group"
                    >
                      <span>{link.label}</span>
                      <ArrowUpRight
                        size={20}
                        className="text-white/40 group-hover:text-[#1476FF] group-hover:translate-x-1 group-hover:-translate-y-1 transition-all"
                      />
                    </Link>
                  </motion.div>
                ))}
              </div>

              <div className="flex flex-col gap-4 pt-6 border-t border-white/10">
                <div className="w-full flex justify-center">
                  <WalletButton />
                </div>
                <Link
                  href="/swap"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full py-3.5 rounded-full bg-[#1476FF] text-white text-center font-semibold text-xs tracking-[0.2em] uppercase hover:bg-[#48A7FF] transition-colors"
                >
                  LAUNCH APP ↗
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ----------------- ZONE 2: PROTOCOL INDICATORS ----------------- */}
        <div className="relative z-10 w-full max-w-[1600px] mx-auto px-5 sm:px-8 md:px-12 my-auto py-12 md:py-16">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 md:gap-12">
            {PROTOCOL_METRICS.map((metric, index) => (
              <motion.div
                key={metric.num}
                initial={{ opacity: 0, y: 32 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.6,
                  delay: 0.2 + index * 0.12,
                  ease: [0.22, 1, 0.36, 1],
                }}
                className="flex flex-col border-l border-white/15 pl-5 sm:pl-6 py-2 group hover:border-[#1476FF] transition-colors duration-300"
              >
                <div className="flex items-center gap-1.5 font-mono text-sm md:text-base text-white/40 group-hover:text-white/70 transition-colors">
                  <span className="text-[#1476FF] font-semibold">+</span>
                  <span>{metric.num}</span>
                </div>
                <div className="text-base sm:text-lg md:text-xl font-semibold tracking-[0.15em] text-white uppercase mt-1">
                  {metric.label}
                </div>
                <div className="text-[10px] md:text-[11px] font-medium tracking-[0.25em] text-white/45 uppercase mt-0.5">
                  {metric.sublabel}
                </div>
              </motion.div>
            ))}
          </div>

          {/* Optional Micro CLMM Range Pill */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.55, ease: [0.22, 1, 0.36, 1] }}
            className="mt-8 md:mt-12 inline-flex items-center gap-4 px-4 py-2 rounded-full bg-black/40 border border-white/10 backdrop-blur-md text-xs tracking-wider uppercase text-white/70"
          >
            <span className="inline-flex items-center gap-1.5 text-[#1476FF] font-semibold">
              <Activity size={13} className="animate-pulse" />
              CLMM ACTIVE
            </span>
            <span className="h-3 w-[1px] bg-white/15" />
            <span className="text-white/90 font-mono">XLM ↕ USDC</span>
            <span className="h-3 w-[1px] bg-white/15" />
            <span className="text-white/50">RANGE:</span>
            <span className="font-mono text-white/90">0.95 — 1.05</span>
          </motion.div>
        </div>

        {/* ----------------- ZONE 3: EDITORIAL MESSAGING ----------------- */}
        <div className="relative z-10 w-full max-w-[1600px] mx-auto px-5 sm:px-8 md:px-12 pb-8 md:pb-12 flex flex-col gap-6 md:gap-8">
          {/* Bottom Row A: Left Tagline + Right Launch App */}
          <div className="flex items-end justify-between flex-wrap gap-4 pt-5 border-t border-white/10">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="text-xs md:text-sm font-semibold tracking-[0.22em] text-white/75 leading-relaxed uppercase"
            >
              CAPITAL EFFICIENCY
              <br />
              FOR MODERN
              <br />
              STELLAR MARKETS
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
            >
              <Link
                href="/swap"
                className="group inline-flex items-center gap-2.5 text-sm md:text-base font-semibold tracking-[0.2em] text-[#1476FF] hover:text-[#48A7FF] uppercase transition-colors duration-200"
              >
                <span>LAUNCH APP</span>
                <ArrowUpRight
                  size={18}
                  className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform duration-200"
                />
              </Link>
            </motion.div>
          </div>

          {/* Bottom Row B: Left Description + Right Massive Stacked Headline */}
          <div className="flex flex-col-reverse lg:flex-row lg:items-end justify-between gap-6 lg:gap-12">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.45, ease: [0.22, 1, 0.36, 1] }}
              className="max-w-md text-xs sm:text-sm md:text-base text-white/60 font-normal leading-relaxed"
            >
              A concentrated-liquidity DEX built on Stellar Soroban for precise
              XLM / USDC swaps, custom liquidity ranges, and more efficient capital.
            </motion.div>

            {/* Massive 3-Line Headline with Clip Reveal */}
            <div className="flex flex-col items-start lg:items-end select-none">
              {HEADLINE_WORDS.map((word, index) => (
                <div key={word} className="overflow-hidden">
                  <motion.div
                    initial={{ y: "110%" }}
                    animate={{ y: 0 }}
                    transition={{
                      duration: 0.75,
                      delay: 0.35 + index * 0.14,
                      ease: [0.22, 1, 0.36, 1],
                    }}
                    className="text-[clamp(2.4rem,7.5vw,7.5rem)] font-semibold tracking-tight text-white uppercase leading-[0.9] text-left lg:text-right"
                  >
                    {word}
                  </motion.div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* 2. HOW ASTRAX WORKS                                          */}
      {/* ============================================================ */}
      <section
        id="how-it-works"
        className="py-24 md:py-36 px-5 sm:px-8 md:px-12 max-w-[1600px] mx-auto border-t border-white/5 relative"
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start">
          {/* Left Column: Massive Editorial Heading & Intro */}
          <div className="lg:col-span-5 flex flex-col gap-6 sticky top-24">
            <div className="inline-flex items-center gap-2 text-xs font-semibold tracking-[0.25em] text-[#1476FF] uppercase">
              <span className="w-2 h-2 rounded-full bg-[#1476FF]" />
              HOW ASTRAX WORKS
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-semibold tracking-tight uppercase leading-[0.92] text-white">
              LIQUIDITY
              <br />
              WHERE IT
              <br />
              MATTERS
            </h2>
            <p className="text-sm md:text-base text-white/60 leading-relaxed max-w-lg">
              Traditional AMMs spread liquidity across the full price curve. AstraX
              lets liquidity providers concentrate capital inside chosen price ranges.
            </p>
            <div className="pt-2">
              <Link
                href="/liquidity"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white text-black font-semibold text-xs tracking-[0.18em] uppercase hover:bg-white/90 active:scale-95 transition-all"
              >
                <span>EXPLORE POOLS</span>
                <ArrowUpRight size={15} />
              </Link>
            </div>
          </div>

          {/* Right Column: 3 Steps */}
          <div className="lg:col-span-7 flex flex-col gap-6">
            {[
              {
                step: "01",
                title: "SELECT A RANGE",
                desc: "Choose where your liquidity should remain active based on market conditions and conviction.",
                detail: "Set custom lower and upper tick boundaries for XLM / USDC.",
                icon: Sliders,
              },
              {
                step: "02",
                title: "ADD LIQUIDITY",
                desc: "Supply XLM and USDC to the selected price range without third-party custody.",
                detail: "Capital is allocated precisely within the active tick boundaries.",
                icon: Coins,
              },
              {
                step: "03",
                title: "EARN FROM ACTIVITY",
                desc: "Liquidity earns 0.30% fees while trading occurs inside the active range.",
                detail: "Real-time fee accrual with direct on-chain collection.",
                icon: TrendingUp,
              },
            ].map(({ step, title, desc, detail, icon: Icon }) => (
              <div
                key={step}
                className="p-6 sm:p-8 rounded-2xl bg-[#0c0d14]/80 border border-white/10 hover:border-[#1476FF]/50 transition-all duration-300 group flex flex-col gap-4"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm font-semibold text-[#1476FF]">
                      +{step}
                    </span>
                    <h3 className="text-lg sm:text-xl font-semibold tracking-[0.15em] uppercase text-white">
                      {title}
                    </h3>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/60 group-hover:text-[#1476FF] group-hover:border-[#1476FF]/40 transition-colors">
                    <Icon size={18} />
                  </div>
                </div>
                <p className="text-sm md:text-base text-white/70 leading-relaxed">
                  {desc}
                </p>
                <div className="text-xs font-mono text-white/40 tracking-wide border-t border-white/5 pt-3">
                  {detail}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* 3. WHY CLMM SECTION                                          */}
      {/* ============================================================ */}
      <section
        id="why-clmm"
        className="py-24 md:py-36 px-5 sm:px-8 md:px-12 max-w-[1600px] mx-auto border-t border-white/5"
      >
        <div className="flex flex-col gap-12">
          {/* Header */}
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 text-xs font-semibold tracking-[0.25em] text-[#1476FF] uppercase">
                <span className="w-2 h-2 rounded-full bg-[#1476FF]" />
                CAPITAL EFFICIENCY
              </div>
              <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-semibold tracking-tight uppercase leading-[0.92] text-white mt-3">
                MORE CAPITAL.
                <br />
                MORE CONTROL.
              </h2>
            </div>
            <p className="text-sm md:text-base text-white/60 max-w-md leading-relaxed">
              Concentrated liquidity places LP capital closer to the active market
              price, increasing capital efficiency and helping traders access
              deeper liquidity where it matters.
            </p>
          </div>

          {/* Visual Price Curve Diagram */}
          <div className="p-6 sm:p-10 rounded-3xl bg-[#0c0d14]/90 border border-white/10 relative overflow-hidden">
            <div className="flex items-center justify-between flex-wrap gap-4 pb-6 border-b border-white/10">
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-[#1476FF]" />
                  <span className="text-xs font-semibold tracking-wider uppercase text-white">
                    AstraX CLMM Curve
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-white/20" />
                  <span className="text-xs font-semibold tracking-wider uppercase text-white/40">
                    Standard AMM (x·y=k)
                  </span>
                </div>
              </div>
              <div className="px-3 py-1 rounded-full bg-[#1476FF]/10 border border-[#1476FF]/30 text-[#48A7FF] text-xs font-mono font-semibold uppercase">
                Up to 4000x Efficiency
              </div>
            </div>

            {/* SVG Visual Price Curve */}
            <div className="py-10 flex flex-col items-center justify-center">
              <div className="w-full max-w-3xl h-64 relative flex items-center justify-center">
                <svg
                  viewBox="0 0 800 240"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-full h-full overflow-visible"
                >
                  <defs>
                    <linearGradient
                      id="clmm-curve-grad"
                      x1="400"
                      y1="20"
                      x2="400"
                      y2="220"
                      gradientUnits="userSpaceOnUse"
                    >
                      <stop offset="0%" stopColor="#1476FF" stopOpacity="0.4" />
                      <stop offset="100%" stopColor="#1476FF" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>

                  {/* Grid Lines */}
                  <line
                    x1="100"
                    y1="220"
                    x2="700"
                    y2="220"
                    stroke="rgba(255,255,255,0.1)"
                    strokeWidth="1"
                  />
                  <line
                    x1="100"
                    y1="120"
                    x2="700"
                    y2="120"
                    stroke="rgba(255,255,255,0.05)"
                    strokeDasharray="4 4"
                  />

                  {/* Standard Flat AMM curve */}
                  <path
                    d="M 100 190 Q 400 170 700 190"
                    stroke="rgba(255,255,255,0.25)"
                    strokeWidth="2"
                    strokeDasharray="6 6"
                  />

                  {/* Concentrated Curve Fill */}
                  <path
                    d="M 250 220 C 320 220 350 40 400 40 C 450 40 480 220 550 220 Z"
                    fill="url(#clmm-curve-grad)"
                  />

                  {/* Concentrated Curve Stroke */}
                  <path
                    d="M 250 220 C 320 220 350 40 400 40 C 450 40 480 220 550 220"
                    stroke="#1476FF"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                  />

                  {/* Lower Tick Line */}
                  <line
                    x1="250"
                    y1="30"
                    x2="250"
                    y2="220"
                    stroke="#48A7FF"
                    strokeWidth="1.5"
                    strokeDasharray="3 3"
                  />

                  {/* Current Price Line */}
                  <line
                    x1="400"
                    y1="20"
                    x2="400"
                    y2="220"
                    stroke="#FFFFFF"
                    strokeWidth="2"
                  />
                  <circle cx="400" cy="40" r="5" fill="#1476FF" stroke="#FFFFFF" strokeWidth="2" />

                  {/* Upper Tick Line */}
                  <line
                    x1="550"
                    y1="30"
                    x2="550"
                    y2="220"
                    stroke="#48A7FF"
                    strokeWidth="1.5"
                    strokeDasharray="3 3"
                  />
                </svg>
              </div>

              {/* Tick Labels Row */}
              <div className="w-full max-w-3xl grid grid-cols-3 text-center pt-4 border-t border-white/10 font-mono text-xs uppercase">
                <div className="text-left">
                  <span className="text-[#48A7FF] font-semibold block">LOWER TICK</span>
                  <span className="text-white/40 text-[10px]">MIN RANGE</span>
                </div>
                <div className="text-center">
                  <span className="text-white font-semibold block">CURRENT PRICE</span>
                  <span className="text-[#1476FF] text-[10px]">ACTIVE SPOT</span>
                </div>
                <div className="text-right">
                  <span className="text-[#48A7FF] font-semibold block">UPPER TICK</span>
                  <span className="text-white/40 text-[10px]">MAX RANGE</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* 4. TRADER / LP SPLIT                                         */}
      {/* ============================================================ */}
      <section className="py-24 md:py-36 px-5 sm:px-8 md:px-12 max-w-[1600px] mx-auto border-t border-white/5">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
          {/* FOR TRADERS */}
          <div className="p-8 sm:p-12 rounded-3xl bg-[#0c0d14]/70 border border-white/10 flex flex-col justify-between group hover:border-white/20 transition-all">
            <div>
              <div className="inline-flex items-center gap-2 text-xs font-semibold tracking-[0.25em] text-[#1476FF] uppercase mb-4">
                <Zap size={14} />
                FOR TRADERS
              </div>
              <h3 className="text-2xl sm:text-3xl md:text-4xl font-semibold tracking-tight uppercase text-white mb-6">
                OPTIMIZED EXECUTION.
                <br />
                MINIMAL SLIPPAGE.
              </h3>
              <ul className="flex flex-col gap-4 mb-8">
                {[
                  "XLM / USDC swaps with sub-second Soroban settlement",
                  "Deeper active liquidity where market trades occur",
                  "Significantly lower price impact on larger orders",
                  "Direct non-custodial wallet execution via Freighter",
                ].map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-3 text-sm md:text-base text-white/70"
                  >
                    <CheckCircle2
                      size={18}
                      className="text-[#1476FF] shrink-0 mt-0.5"
                    />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <Link
              href="/swap"
              className="inline-flex items-center justify-between w-full px-6 py-4 rounded-2xl bg-white/5 border border-white/10 hover:border-[#1476FF] hover:bg-[#1476FF]/10 text-white text-xs font-semibold tracking-[0.2em] uppercase transition-all group/btn"
            >
              <span>SWAP XLM / USDC</span>
              <ArrowUpRight
                size={16}
                className="group-hover/btn:translate-x-1 group-hover/btn:-translate-y-1 transition-transform"
              />
            </Link>
          </div>

          {/* FOR LIQUIDITY PROVIDERS */}
          <div className="p-8 sm:p-12 rounded-3xl bg-[#0c0d14]/70 border border-white/10 flex flex-col justify-between group hover:border-[#1476FF]/50 transition-all">
            <div>
              <div className="inline-flex items-center gap-2 text-xs font-semibold tracking-[0.25em] text-[#48A7FF] uppercase mb-4">
                <Layers size={14} />
                FOR LIQUIDITY PROVIDERS
              </div>
              <h3 className="text-2xl sm:text-3xl md:text-4xl font-semibold tracking-tight uppercase text-white mb-6">
                PRECISION RANGES.
                <br />
                MAXIMUM CAPITAL.
              </h3>
              <ul className="flex flex-col gap-4 mb-8">
                {[
                  "Custom price ranges tailored to your risk and market outlook",
                  "Tick-based positions for granular capital concentration",
                  "Transparent 0.30% fee tier with real-time fee accrual",
                  "LP position tracking and non-custodial position withdrawal",
                ].map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-3 text-sm md:text-base text-white/70"
                  >
                    <CheckCircle2
                      size={18}
                      className="text-[#48A7FF] shrink-0 mt-0.5"
                    />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <Link
              href="/liquidity"
              className="inline-flex items-center justify-between w-full px-6 py-4 rounded-2xl bg-[#1476FF] hover:bg-[#48A7FF] text-white text-xs font-semibold tracking-[0.2em] uppercase transition-all shadow-[0_0_20px_rgba(20,118,255,0.3)] group/btn"
            >
              <span>CREATE POSITION</span>
              <ArrowUpRight
                size={16}
                className="group-hover/btn:translate-x-1 group-hover/btn:-translate-y-1 transition-transform"
              />
            </Link>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* 5. TECHNOLOGY STRIP                                          */}
      {/* ============================================================ */}
      <section
        id="technology"
        className="py-16 md:py-24 px-5 sm:px-8 md:px-12 max-w-[1600px] mx-auto border-t border-white/5"
      >
        <div className="flex flex-col gap-8">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="text-xs font-semibold tracking-[0.25em] text-white/50 uppercase">
              POWERED BY DECENTRALIZED INFRASTRUCTURE
            </div>
            <div className="text-xs font-mono text-white/40">
              STELLAR PROTOCOL 20+
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 md:gap-6">
            {[
              { name: "STELLAR", role: "SETTLEMENT LAYER", icon: Shield },
              { name: "SOROBAN", role: "SMART CONTRACTS", icon: Cpu },
              { name: "FREIGHTER", role: "WALLET INTEGRATION", icon: Zap },
              { name: "TYPESCRIPT", role: "TYPE-SAFE MATH", icon: Activity },
              { name: "NEXT.JS", role: "UI FRAMEWORK", icon: Layers },
            ].map(({ name, role, icon: Icon }) => (
              <div
                key={name}
                className="p-5 rounded-2xl bg-white/[0.02] border border-white/10 hover:border-[#1476FF]/40 hover:bg-white/[0.04] transition-all flex flex-col gap-2 group"
              >
                <Icon
                  size={20}
                  className="text-white/40 group-hover:text-[#1476FF] transition-colors"
                />
                <div className="text-sm font-semibold tracking-wider uppercase text-white mt-1">
                  {name}
                </div>
                <div className="text-[10px] font-mono text-white/40 tracking-widest uppercase">
                  {role}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* 6. FINAL CTA                                                 */}
      {/* ============================================================ */}
      <section className="py-28 md:py-40 px-5 sm:px-8 md:px-12 max-w-[1600px] mx-auto border-t border-white/5 text-center flex flex-col items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(20,118,255,0.1)_0%,_transparent_70%)] pointer-events-none" />

        <div className="relative z-10 flex flex-col items-center gap-6 max-w-3xl">
          <div className="inline-flex items-center gap-2 text-xs font-semibold tracking-[0.25em] text-[#1476FF] uppercase">
            <span className="w-2 h-2 rounded-full bg-[#1476FF]" />
            EXPERIENCE ASTRAX
          </div>
          <h2 className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-semibold tracking-tight uppercase leading-[0.9] text-white">
            BUILD LIQUIDITY
            <br />
            WHERE MARKETS
            <br />
            MOVE
          </h2>
          <p className="text-sm md:text-base text-white/60 max-w-lg leading-relaxed">
            Trade and manage concentrated-liquidity positions on Stellar with
            AstraX.
          </p>

          <div className="flex items-center justify-center flex-wrap gap-4 pt-4">
            <Link
              href="/swap"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-[#1476FF] text-white font-semibold text-xs tracking-[0.2em] uppercase hover:bg-[#48A7FF] transition-all shadow-[0_0_30px_rgba(20,118,255,0.4)] active:scale-95"
            >
              <span>LAUNCH APP</span>
              <ArrowUpRight size={16} />
            </Link>
            <Link
              href="/liquidity"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-white/5 border border-white/15 text-white font-semibold text-xs tracking-[0.2em] uppercase hover:bg-white/10 transition-all active:scale-95"
            >
              <span>EXPLORE LIQUIDITY</span>
            </Link>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* 7. FOOTER                                                    */}
      {/* ============================================================ */}
      <footer className="py-16 px-5 sm:px-8 md:px-12 max-w-[1600px] mx-auto border-t border-white/10">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-12 items-start">
          {/* Brand Col */}
          <div className="md:col-span-5 flex flex-col gap-4">
            <Link
              href="/"
              className="flex items-center gap-3 no-underline group select-none"
            >
              <div className="w-8 h-8 rounded-lg bg-black/60 border border-white/15 flex items-center justify-center p-1 group-hover:border-[#1476FF]/60 transition-all">
                <LogoMark className="w-6 h-6 text-[#1476FF]" />
              </div>
              <span className="text-sm font-semibold tracking-[0.25em] text-white uppercase">
                ASTRAX
              </span>
            </Link>
            <p className="text-xs md:text-sm text-white/50 max-w-sm leading-relaxed">
              A concentrated-liquidity DEX built on Stellar Soroban for capital-efficient
              XLM / USDC trading and liquidity provision.
            </p>
          </div>

          {/* Links Col 1: Product */}
          <div className="md:col-span-2 flex flex-col gap-3">
            <div className="text-xs font-semibold tracking-[0.2em] uppercase text-white">
              PRODUCT
            </div>
            <div className="flex flex-col gap-2 text-xs font-medium tracking-wider uppercase text-white/60">
              <Link href="/swap" className="hover:text-white transition-colors">
                SWAP
              </Link>
              <Link
                href="/liquidity"
                className="hover:text-white transition-colors"
              >
                LIQUIDITY
              </Link>
              <Link
                href="/portfolio"
                className="hover:text-white transition-colors"
              >
                PORTFOLIO
              </Link>
            </div>
          </div>

          {/* Links Col 2: Protocol */}
          <div className="md:col-span-2 flex flex-col gap-3">
            <div className="text-xs font-semibold tracking-[0.2em] uppercase text-white">
              PROTOCOL
            </div>
            <div className="flex flex-col gap-2 text-xs font-medium tracking-wider uppercase text-white/60">
              <a
                href="#how-it-works"
                className="hover:text-white transition-colors"
              >
                HOW IT WORKS
              </a>
              <a
                href="#why-clmm"
                className="hover:text-white transition-colors"
              >
                WHY CLMM
              </a>
              <a
                href="#technology"
                className="hover:text-white transition-colors"
              >
                TECHNOLOGY
              </a>
            </div>
          </div>

          {/* Links Col 3: Ecosystem */}
          <div className="md:col-span-3 flex flex-col gap-3">
            <div className="text-xs font-semibold tracking-[0.2em] uppercase text-white">
              ECOSYSTEM
            </div>
            <div className="flex flex-col gap-2 text-xs font-medium tracking-wider uppercase text-white/60">
              <a
                href="https://stellar.org"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-white transition-colors inline-flex items-center gap-1"
              >
                <span>STELLAR</span>
                <ArrowUpRight size={12} />
              </a>
              <a
                href="https://developers.stellar.org/docs/build/smart-contracts/overview"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-white transition-colors inline-flex items-center gap-1"
              >
                <span>SOROBAN</span>
                <ArrowUpRight size={12} />
              </a>
              <a
                href="https://freighter.app"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-white transition-colors inline-flex items-center gap-1"
              >
                <span>FREIGHTER</span>
                <ArrowUpRight size={12} />
              </a>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-8 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-mono text-white/40">
          <div>© 2026 AstraX. All rights reserved.</div>
          <div>Built on Stellar Soroban</div>
        </div>
      </footer>
    </div>
  );
}

export default AstraxLanding;
