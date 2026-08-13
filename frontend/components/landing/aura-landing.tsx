"use client";

import React, { useEffect, useRef } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { ChevronRight } from "lucide-react";

export function ActionButton({ label, full = false }: { label: string; full?: boolean }) {
  return (
    <button className={`group inline-flex items-center justify-center gap-2 rounded-full bg-white text-black font-semibold text-sm px-6 py-3.5 transition-all hover:bg-white/90 active:scale-[0.98] cursor-pointer shadow-lg hover:shadow-cyan-500/20 ${full ? "w-full" : ""}`}>
      <span>{label}</span>
      <ChevronRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-[2px]" />
    </button>
  );
}

export function AuraLanding() {
  // Xero Animation State & refs
  const pipelineRef = useRef<HTMLDivElement>(null);
  const nodeStackRef = useRef<HTMLDivElement>(null);
  const nodeXRef = useRef<HTMLDivElement>(null);
  const nodeShieldRef = useRef<HTMLDivElement>(null);
  const glowPathRef = useRef<SVGPathElement>(null);
  const corePathRef = useRef<SVGPathElement>(null);
  const gradientRef = useRef<SVGLinearGradientElement>(null);

  useEffect(() => {
    document.body.classList.add("xero-body");

    const recomputePath = () => {
      const pipeline = pipelineRef.current;
      const nodeStack = nodeStackRef.current;
      const nodeX = nodeXRef.current;
      const nodeShield = nodeShieldRef.current;
      const glowPath = glowPathRef.current;
      const corePath = corePathRef.current;

      if (!pipeline || !nodeStack || !nodeX || !nodeShield || !glowPath || !corePath) return;

      const pRect = pipeline.getBoundingClientRect();
      const sRect = nodeStack.getBoundingClientRect();
      const xRect = nodeX.getBoundingClientRect();
      const shRect = nodeShield.getBoundingClientRect();

      const startX = sRect.left + sRect.width / 2 - pRect.left;
      const startY = sRect.top + sRect.height / 2 - pRect.top;

      const midX = xRect.left + xRect.width / 2 - pRect.left;
      const midY = xRect.top + xRect.height / 2 - pRect.top;

      const endX = shRect.left + shRect.width / 2 - pRect.left;
      const endY = shRect.top + shRect.height / 2 - pRect.top;

      const d = `M ${startX},${startY} L ${midX},${midY} L ${endX},${endY}`;
      glowPath.setAttribute("d", d);
      corePath.setAttribute("d", d);
    };

    recomputePath();
    window.addEventListener("resize", recomputePath);

    let animationFrameId: number;
    let state = "p1";
    let lastStateChange = performance.now();

    const loop = (timestamp: number) => {
      const elapsed = timestamp - lastStateChange;
      const gradient = gradientRef.current;

      if (state === "p1") {
        if (elapsed >= 800) {
          state = "splash";
          lastStateChange = timestamp;
        } else {
          const progress = elapsed / 800;
          const percentage = progress * 0.5;
          const center = percentage * 100;
          if (gradient) {
            gradient.setAttribute("x1", `${center - 5}%`);
            gradient.setAttribute("x2", `${center + 5}%`);
          }
        }
      } else if (state === "splash") {
        if (elapsed >= 800) {
          state = "p2";
          lastStateChange = timestamp;
        }
      } else if (state === "p2") {
        if (elapsed >= 800) {
          state = "idle";
          lastStateChange = timestamp;
        } else {
          const progress = elapsed / 800;
          const percentage = 0.5 + progress * 0.5;
          const center = percentage * 100;
          if (gradient) {
            gradient.setAttribute("x1", `${center - 5}%`);
            gradient.setAttribute("x2", `${center + 5}%`);
          }
        }
      } else if (state === "idle") {
        if (elapsed >= 1000) {
          state = "p1";
          lastStateChange = timestamp;
        }
      }

      recomputePath();
      animationFrameId = requestAnimationFrame(loop);
    };

    animationFrameId = requestAnimationFrame(loop);

    return () => {
      document.body.classList.remove("xero-body");
      window.removeEventListener("resize", recomputePath);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div className="w-full flex flex-col items-center text-white">
      {/* 1. Shared Single Premium Navbar */}
      <Navbar />

      {/* 2. Hero Section */}
      <section className="hero-card select-none w-full max-w-[1400px] px-4 sm:px-6 pt-24">
        <div className="hero-grid" />

        {/* Animated Icon Pipeline */}
        <div className="icon-pipeline" ref={pipelineRef}>
          <svg className="beam-svg">
            <defs>
              <filter id="glow">
                <feGaussianBlur stdDeviation="2" />
                <feComposite in2="SourceGraphic" operator="over" />
              </filter>
              <linearGradient id="beam-gradient" gradientUnits="userSpaceOnUse" ref={gradientRef}>
                <stop offset="0%" stopColor="#00d4ff" stopOpacity="0" />
                <stop offset="20%" stopColor="#00d4ff" stopOpacity="0.8" />
                <stop offset="50%" stopColor="#ffffff" stopOpacity="1" />
                <stop offset="80%" stopColor="#7c5cff" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#7c5cff" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path ref={glowPathRef} fill="none" stroke="url(#beam-gradient)" strokeWidth="2" filter="url(#glow)" opacity={0.6} />
            <path ref={corePathRef} fill="none" stroke="url(#beam-gradient)" strokeWidth="1" opacity={1} />
          </svg>

          {/* XLM Token Icon Node */}
          <div ref={nodeStackRef} className="icon-node flex items-center justify-center p-1 bg-[#10121B] border border-white/10 rounded-full">
            <img src="/xlm.svg" alt="Stellar XLM" className="w-7 h-7 object-contain" />
          </div>

          <div className="pipeline-line" />

          {/* Center LuminaDex Logo Node */}
          <div className="relative">
            <div ref={nodeXRef} className="icon-node-center flex items-center justify-center p-2 bg-[#0B0D17] border border-[#00d4ff]/40 rounded-full shadow-[0_0_20px_rgba(0,212,255,0.3)]">
              <img src="/lumina-logo.svg" alt="LuminaDex" className="w-10 h-10 object-contain" />
            </div>
          </div>

          <div className="pipeline-line right" />

          {/* USDC Token Icon Node */}
          <div ref={nodeShieldRef} className="icon-node flex items-center justify-center p-1 bg-[#10121B] border border-white/10 rounded-full">
            <img src="/usdc.svg" alt="USD Coin USDC" className="w-7 h-7 object-contain" />
          </div>
        </div>

        {/* Hero Content */}
        <div className="hero-content">
          <div className="mb-6 flex justify-center">
            <span className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 text-xs text-cyan-300 font-semibold tracking-wide uppercase shadow-[0_0_15px_rgba(0,212,255,0.15)]">
              <span className="w-2 h-2 rounded-full bg-[#00d4ff] animate-pulse" />
              Stellar Concentrated Liquidity DEX
            </span>
          </div>

          <h1 className="hero-heading text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight">
            Next-Gen DEX for
            <strong className="block bg-gradient-to-r from-[#00d4ff] via-[#7c5cff] to-[#e052ff] bg-clip-text text-transparent mt-2">
              Pools, Swaps & Yields
            </strong>
          </h1>
          
          <p className="hero-sub max-w-2xl mx-auto text-base sm:text-lg text-white/70 mt-6 leading-relaxed">
            Trade with concentrated liquidity, tight spreads, and instant settlement — fully non-custodial on Stellar Soroban.
          </p>

          {/* Supported Assets Highlight */}
          <div className="mt-8 flex items-center justify-center gap-6">
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/[0.04] border border-white/10">
              <img src="/xlm.svg" alt="XLM" className="w-6 h-6 rounded-full" />
              <span className="text-sm font-semibold text-white">Stellar Lumens (XLM)</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/[0.04] border border-white/10">
              <img src="/usdc.svg" alt="USDC" className="w-6 h-6 rounded-full" />
              <span className="text-sm font-semibold text-white">USD Coin (USDC)</span>
            </div>
          </div>
          
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link href="/swap" className="btn-cta text-base px-8 py-4 rounded-full font-bold bg-gradient-to-r from-[#00d4ff] to-[#7c5cff] text-white hover:opacity-90 transition-all shadow-[0_0_25px_rgba(0,212,255,0.3)]">
              Launch App →
            </Link>
            <Link href="/liquidity" className="px-8 py-4 rounded-full font-bold text-white/80 bg-white/5 border border-white/10 hover:bg-white/10 hover:text-white transition-all">
              Provide Liquidity
            </Link>
          </div>
        </div>
      </section>

      {/* 3. Feature Highlights Section */}
      <section className="w-full max-w-[1280px] px-6 py-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="p-8 rounded-3xl bg-white/[0.02] border border-white/10 hover:border-[#00d4ff]/40 transition-all backdrop-blur-xl group">
            <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center mb-6 text-[#00d4ff] text-xl font-bold group-hover:scale-110 transition-transform">
              <img src="/xlm.svg" alt="XLM" className="w-7 h-7" />
            </div>
            <h3 className="text-xl font-bold text-white mb-3">Concentrated Liquidity</h3>
            <p className="text-white/60 text-sm leading-relaxed">
              Maximize capital efficiency by selecting custom price ranges for XLM/USDC pools, earning significantly higher APY.
            </p>
          </div>

          <div className="p-8 rounded-3xl bg-white/[0.02] border border-white/10 hover:border-[#7c5cff]/40 transition-all backdrop-blur-xl group">
            <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mb-6 text-[#7c5cff] text-xl font-bold group-hover:scale-110 transition-transform">
              <img src="/usdc.svg" alt="USDC" className="w-7 h-7" />
            </div>
            <h3 className="text-xl font-bold text-white mb-3">Instant Sub-Second Swaps</h3>
            <p className="text-white/60 text-sm leading-relaxed">
              Execute trades on Stellar Soroban smart contracts with near-zero slippage, minimal gas fees, and instant settlement.
            </p>
          </div>

          <div className="p-8 rounded-3xl bg-white/[0.02] border border-white/10 hover:border-pink-500/40 transition-all backdrop-blur-xl group">
            <div className="w-12 h-12 rounded-2xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-center mb-6 text-[#e052ff] text-xl stroke-current group-hover:scale-110 transition-transform">
              <img src="/lumina-logo.svg" alt="LuminaDex" className="w-7 h-7" />
            </div>
            <h3 className="text-xl font-bold text-white mb-3">Non-Custodial & Secure</h3>
            <p className="text-white/60 text-sm leading-relaxed">
              Connect directly via Freighter wallet. Maintain 100% control of your private keys and automated fee distributions.
            </p>
          </div>
        </div>
      </section>

      {/* 4. Supported Assets & Ecosystem Footer */}
      <footer className="w-full border-t border-white/10 bg-[#06060c] py-12 px-6">
        <div className="max-w-[1280px] mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <img src="/lumina-logo.svg" alt="LuminaDex Logo" className="w-7 h-7" />
            <span className="font-bold text-white text-base">LuminaDex</span>
            <span className="text-xs text-white/40">© 2026 LuminaDex. All rights reserved.</span>
          </div>

          <div className="flex items-center gap-6 text-sm text-white/60">
            <Link href="/swap" className="hover:text-white transition-colors">Swap</Link>
            <Link href="/liquidity" className="hover:text-white transition-colors">Liquidity</Link>
            <Link href="/portfolio" className="hover:text-white transition-colors">Portfolio</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
