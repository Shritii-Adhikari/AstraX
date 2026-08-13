"use client";

import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";

const tiers = [
  {
    name: "0.01%",
    description: "Best for stable pairs like USDC / EURC",
    features: [
      "Stablecoin pairs",
      "Tightest spreads",
      "High volume, low volatility",
      "Ideal for arbitrage",
      "Lowest price impact",
    ],
    cta: "View pools",
    popular: false,
  },
  {
    name: "0.05%",
    description: "Best for correlated assets like XLM / yXLM",
    features: [
      "Correlated pairs",
      "Balanced fee yield",
      "Efficient capital use",
      "Moderate volatility",
      "Popular with LPs",
    ],
    cta: "View pools",
    popular: true,
  },
  {
    name: "0.30%",
    description: "Best for standard pairs like XLM / USDC",
    features: [
      "Standard pairs",
      "Higher fee yield",
      "Compensates for volatility",
      "Wider price ranges",
      "Default for new pools",
    ],
    cta: "View pools",
    popular: false,
  },
];

export function PricingSection() {
  return (
    <section id="pricing" className="relative py-32 lg:py-40 border-t border-foreground/10">
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        {/* Header */}
        <div className="max-w-3xl mb-20">
          <span className="font-mono text-xs tracking-widest text-muted-foreground uppercase block mb-6">
            Fee tiers
          </span>
          <h2 className="font-display text-5xl md:text-6xl lg:text-7xl tracking-tight text-foreground mb-6">
            Simple, transparent
            <br />
            <span className="text-stroke">fees</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-xl">
            Choose the fee tier that matches your pair&apos;s volatility.
            Fees are paid by traders and earned entirely by liquidity providers.
          </p>
        </div>

        {/* Fee Tier Cards */}
        <div className="grid md:grid-cols-3 gap-px bg-foreground/10">
          {tiers.map((tier, idx) => (
            <div
              key={tier.name}
              className={`relative p-8 lg:p-12 bg-background ${
                tier.popular ? "md:-my-4 md:py-12 lg:py-16 border-2 border-foreground" : ""
              }`}
            >
              {tier.popular && (
                <span className="absolute -top-3 left-8 px-3 py-1 bg-foreground text-primary-foreground text-xs font-mono uppercase tracking-widest">
                  Most Popular
                </span>
              )}

              {/* Tier Header */}
              <div className="mb-8 pb-8 border-b border-foreground/10">
                <span className="font-mono text-xs text-muted-foreground">
                  {String(idx + 1).padStart(2, "0")}
                </span>
                <h3 className="font-display text-5xl lg:text-6xl text-foreground mt-2">{tier.name}</h3>
                <p className="text-sm text-muted-foreground mt-2">{tier.description}</p>
              </div>

              {/* Features */}
              <ul className="space-y-4 mb-10">
                {tier.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3">
                    <Check className="w-4 h-4 text-foreground mt-0.5 shrink-0" />
                    <span className="text-sm text-muted-foreground">{feature}</span>
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <Link
                href="/liquidity"
                className={`w-full py-4 flex items-center justify-center gap-2 text-sm font-medium transition-all group ${
                  tier.popular
                    ? "bg-foreground text-primary-foreground hover:bg-foreground/90"
                    : "border border-foreground/20 text-foreground hover:border-foreground hover:bg-foreground/5"
                }`}
              >
                {tier.cta}
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
          ))}
        </div>

        {/* Bottom Note */}
        <p className="mt-12 text-center text-sm text-muted-foreground">
          Trading fees are collected automatically and distributed to liquidity providers in the pool.{" "}
          <Link href="/liquidity" className="underline underline-offset-4 hover:text-foreground transition-colors">
            View all pools
          </Link>
        </p>
      </div>
    </section>
  );
}
