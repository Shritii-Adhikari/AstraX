"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Activity,
  ArrowUpRight,
  BarChart3,
  BookOpen,
  Check,
  ChevronDown,
  CircleDollarSign,
  Code2,
  Coins,
  Droplets,
  Gauge,
  Layers3,
  Menu,
  Network,
  ShieldCheck,
  SlidersHorizontal,
  WalletCards,
  X,
} from "lucide-react";
import WalletButton from "@/components/WalletButton";
import { useMarket24h, useSpotPrices } from "@/hooks/useMarketData";
import { usePool } from "@/hooks/usePool";
import { usePoolReserves } from "@/hooks/usePoolStats";
import { FEE_TIER } from "@/lib/stellar/assets";
import chromeA from "@/public/astrax-chrome-a.png";
import styles from "./astrax-landing.module.css";

const navigation = [
  { label: "Swap", href: "/swap" },
  { label: "Liquidity", href: "/liquidity" },
  { label: "Portfolio", href: "/portfolio" },
  { label: "Docs", href: "#insights" },
  { label: "Learn", href: "#learn" },
];

const features = [
  {
    icon: Droplets,
    title: "Concentrated liquidity",
    description:
      "Focus liquidity inside custom price ranges to improve capital efficiency and earn fees while the market remains in range.",
  },
  {
    icon: SlidersHorizontal,
    title: "Range tools",
    description: "Set and manage precise tick-based positions for the XLM and USDC market.",
  },
  {
    icon: BarChart3,
    title: "Real-time portfolio",
    description: "Track position status, balances and fee accrual from one portfolio view.",
  },
];

const reasons = [
  {
    icon: Gauge,
    title: "Maximum capital efficiency",
    description: "Concentrate liquidity where trading happens.",
  },
  {
    icon: Code2,
    title: "Built on Soroban",
    description: "Composable smart contracts on Stellar.",
  },
  {
    icon: WalletCards,
    title: "Non-custodial",
    description: "Your connected wallet remains in control.",
  },
  {
    icon: CircleDollarSign,
    title: "Clear fee model",
    description: "The live XLM / USDC pool uses a 0.30% fee.",
  },
];

const lpCapabilities = [
  "Concentrated price ranges",
  "Tick-based liquidity",
  "On-chain fee accrual",
  "Fee collection",
  "Portfolio tracking",
  "Position management",
];

const insights = [
  {
    icon: Droplets,
    title: "Understanding concentrated liquidity",
    description: "How selected price ranges change capital usage and fee exposure.",
  },
  {
    icon: Network,
    title: "Why Stellar for DeFi",
    description: "A practical look at smart contracts, assets and settlement on Stellar.",
  },
  {
    icon: Layers3,
    title: "Managing CLMM positions",
    description: "What active ranges, ticks and fee collection mean for liquidity providers.",
  },
];

const faqs = [
  {
    question: "What is AstraX?",
    answer:
      "AstraX is a concentrated liquidity decentralized exchange built on Stellar Soroban for the XLM and USDC market.",
  },
  {
    question: "What is concentrated liquidity?",
    answer:
      "It lets liquidity providers allocate capital to a selected price range instead of spreading it across the entire price curve.",
  },
  {
    question: "How do fees work?",
    answer:
      "Liquidity providers earn trading fees while their position is active inside the traded price range. The current pool fee is 0.30%.",
  },
  {
    question: "Is my liquidity safe?",
    answer:
      "AstraX is non-custodial and transactions execute through Soroban smart contracts. Smart contracts still carry risk, so review every transaction before signing.",
  },
  {
    question: "Which wallet is supported?",
    answer: "AstraX supports Freighter through the wallet connection already integrated into the application.",
  },
];

function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className={styles.brand} aria-label="AstraX home">
      <span className={styles.brandMark} aria-hidden="true">A</span>
      {!compact && <span>AstraX</span>}
    </Link>
  );
}

function LandingNavigation() {
  const [open, setOpen] = useState(false);

  return (
    <header className={styles.siteHeader}>
      <div className={styles.navInner}>
        <BrandMark />
        <nav className={styles.desktopNav} aria-label="Primary navigation">
          {navigation.map((item) => (
            <Link key={item.label} href={item.href}>{item.label}</Link>
          ))}
        </nav>
        <div className={styles.walletSlot}>
          <WalletButton />
        </div>
        <button
          type="button"
          className={styles.menuButton}
          aria-label={open ? "Close navigation" : "Open navigation"}
          aria-expanded={open}
          aria-controls="landing-mobile-nav"
          onClick={() => setOpen((current) => !current)}
        >
          {open ? <X size={19} /> : <Menu size={19} />}
        </button>
      </div>
      {open && (
        <div id="landing-mobile-nav" className={styles.mobileNav}>
          {navigation.map((item) => (
            <Link key={item.label} href={item.href} onClick={() => setOpen(false)}>
              {item.label}
              <ArrowUpRight size={16} aria-hidden="true" />
            </Link>
          ))}
          <div className={styles.mobileWallet}><WalletButton /></div>
        </div>
      )}
    </header>
  );
}

function formatUsd(value: number | null) {
  if (value === null || !Number.isFinite(value)) return "Unavailable";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: value >= 10_000 ? "compact" : "standard",
    maximumFractionDigits: value < 1 ? 4 : 2,
  }).format(value);
}

function formatReserve(value: number | undefined) {
  if (value === undefined || !Number.isFinite(value)) return "Unavailable";
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 2,
  }).format(value);
}

function Sparkline({ values }: { values: number[] }) {
  const points = useMemo(() => {
    if (values.length < 2) return "";
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;
    return values
      .map((value, index) => {
        const x = (index / (values.length - 1)) * 360;
        const y = 112 - ((value - min) / range) * 96;
        return `${x.toFixed(2)},${y.toFixed(2)}`;
      })
      .join(" ");
  }, [values]);

  if (!points) return <div className={styles.chartEmpty}>Market series unavailable</div>;

  return (
    <svg
      className={styles.sparkline}
      viewBox="0 0 360 128"
      role="img"
      aria-label="XLM price movement over the last 24 hours"
      preserveAspectRatio="none"
    >
      <polyline points={points} fill="none" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

function SectionIntro({
  label,
  title,
  description,
  align = "left",
}: {
  label?: string;
  title: string;
  description?: string;
  align?: "left" | "center";
}) {
  return (
    <div className={`${styles.sectionIntro} ${align === "center" ? styles.centered : ""}`}>
      {label && <p className={styles.eyebrow}>{label}</p>}
      <h2>{title}</h2>
      {description && <p>{description}</p>}
    </div>
  );
}

export function AuraLanding() {
  const { data: reserves, isLoading: reservesLoading } = usePoolReserves();
  const { data: spot, isLoading: spotLoading } = useSpotPrices();
  const { data: market, isLoading: marketLoading } = useMarket24h();
  const { data: pool, isLoading: poolLoading } = usePool();
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const feePercent = FEE_TIER / 10_000;
  const poolTvl = reserves && spot
    ? reserves.xlmReserve * spot.xlmUsd + reserves.usdcReserve * spot.usdcUsd
    : null;
  const xlmPrice = spot?.xlmUsd ?? (pool?.currentPrice ? 1 / pool.currentPrice : null);
  const change24h = market ? market.change24h * 100 : null;
  const metricValue = (value: string, loading: boolean) =>
    loading ? <span className={styles.metricLoading}>Loading</span> : value;

  return (
    <main data-landing className={styles.page}>
      <a className={styles.skipLink} href="#main-content">Skip to content</a>
      <LandingNavigation />

      <div id="main-content">
        <section className={styles.hero} aria-labelledby="hero-title">
          <div className={styles.container}>
            <div className={styles.heroGrid}>
              <div className={styles.heroCopy}>
                <p className={styles.heroBadge}>
                  <Network size={14} aria-hidden="true" />
                  Built on Stellar Soroban
                </p>
                <h1 id="hero-title">
                  Concentrated Liquidity.<br />
                  Maximum Efficiency.<br />
                  <span>Built for Stellar.</span>
                </h1>
                <p className={styles.heroDescription}>
                  AstraX is a next-generation CLMM DEX built on Stellar Soroban. Trade XLM / USDC with low slippage, concentrated liquidity and advanced LP tools.
                </p>
                <div className={styles.heroActions}>
                  <Link className={styles.primaryButton} href="/swap">
                    Launch App
                    <ArrowUpRight size={16} aria-hidden="true" />
                  </Link>
                  <Link className={styles.secondaryButton} href="/liquidity">Explore Pools</Link>
                </div>
              </div>

              <div className={styles.heroVisual} aria-label="Polished chrome AstraX sculpture">
                <Image
                  src={chromeA}
                  alt="Abstract polished chrome sculpture shaped like the AstraX letter A"
                  sizes="(max-width: 840px) 92vw, 46vw"
                  preload
                />
              </div>
            </div>

            <div className={styles.metrics} aria-label="Live AstraX pool metrics">
              <div>
                <strong>{metricValue(formatUsd(poolTvl), reservesLoading || spotLoading)}</strong>
                <span>Pool TVL</span>
              </div>
              <div>
                <strong>{metricValue(formatUsd(xlmPrice), spotLoading && poolLoading)}</strong>
                <span>XLM market price</span>
              </div>
              <div>
                <strong>{feePercent.toFixed(2)}%</strong>
                <span>Pool fee</span>
              </div>
              <div>
                <strong>{metricValue(pool ? (pool.unlocked ? "Unlocked" : "Paused") : "Unavailable", poolLoading)}</strong>
                <span>Contract state</span>
              </div>
            </div>
          </div>
        </section>

        <section className={styles.section} id="learn">
          <div className={styles.container}>
            <SectionIntro
              label="Core features"
              title="Tools built for LPs. Performance built in."
              description="Focused liquidity tools for managing capital, ranges and on-chain positions with precision."
              align="center"
            />
            <div className={styles.featureGrid}>
              {features.map(({ icon: Icon, title, description }, index) => (
                <article key={title} className={`${styles.featureCard} ${index === 0 ? styles.featureLead : ""}`}>
                  <span className={styles.iconBox}>
                    <Icon size={22} strokeWidth={1.6} aria-hidden="true" />
                  </span>
                  <div>
                    <h3>{title}</h3>
                    <p>{description}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className={styles.section}>
          <div className={`${styles.container} ${styles.aboutGrid}`}>
            <div className={styles.reasonList}>
              {reasons.map(({ icon: Icon, title, description }) => (
                <article key={title}>
                  <span className={styles.smallIcon}>
                    <Icon size={19} strokeWidth={1.6} aria-hidden="true" />
                  </span>
                  <div><h3>{title}</h3><p>{description}</p></div>
                </article>
              ))}
            </div>
            <div className={styles.aboutCopy}>
              <p className={styles.eyebrow}>About AstraX</p>
              <h2>Powering a more precise era of decentralized trading on Stellar.</h2>
              <p>
                AstraX brings concentrated liquidity to Stellar Soroban, giving liquidity providers precise ranges and traders a direct XLM / USDC market.
              </p>
              <div className={styles.aboutMetrics}>
                <div><strong>0.30%</strong><span>Current pool fee</span></div>
                <div><strong>On-chain</strong><span>Pool state</span></div>
                <div><strong>Wallet-led</strong><span>Asset control</span></div>
              </div>
              <Link className={styles.primaryButton} href="/liquidity">
                Learn More
                <ArrowUpRight size={16} aria-hidden="true" />
              </Link>
            </div>
          </div>
        </section>

        <section className={styles.section} aria-labelledby="analytics-title">
          <div className={`${styles.container} ${styles.analyticsGrid}`}>
            <div className={styles.analyticsCopy}>
              <p className={styles.eyebrow}>Live market context</p>
              <h2 id="analytics-title">Powerful tools for your DeFi journey</h2>
              <p>Pool state, market context and position tooling powered by Stellar Soroban.</p>
              <Link className={styles.secondaryButton} href="/portfolio">View Portfolio</Link>
            </div>
            <div className={styles.analyticsCards}>
              <article className={styles.marketCard}>
                <div className={styles.cardTopline}>
                  <span>XLM / USD</span>
                  <Activity size={17} aria-hidden="true" />
                </div>
                <div className={styles.marketValue}>
                  <strong>{metricValue(formatUsd(xlmPrice), spotLoading)}</strong>
                  {change24h !== null && (
                    <span className={change24h >= 0 ? styles.positive : styles.negative}>
                      {change24h >= 0 ? "+" : ""}{change24h.toFixed(2)}%
                    </span>
                  )}
                </div>
                {marketLoading
                  ? <div className={styles.chartLoading}>Loading market series</div>
                  : <Sparkline values={market?.series ?? []} />}
                <div className={styles.rangeRow}>
                  <span>Low {market ? formatUsd(market.low24h) : "Unavailable"}</span>
                  <span>High {market ? formatUsd(market.high24h) : "Unavailable"}</span>
                </div>
              </article>
              <article className={styles.dataCard}>
                <div className={styles.cardTopline}>
                  <span>Pool reserves</span>
                  <Coins size={17} aria-hidden="true" />
                </div>
                <div className={styles.reserveRows}>
                  <div><span>XLM</span><strong>{metricValue(formatReserve(reserves?.xlmReserve), reservesLoading)}</strong></div>
                  <div><span>USDC</span><strong>{metricValue(formatReserve(reserves?.usdcReserve), reservesLoading)}</strong></div>
                </div>
              </article>
              <article className={styles.dataCard}>
                <div className={styles.cardTopline}>
                  <span>Pool status</span>
                  <ShieldCheck size={17} aria-hidden="true" />
                </div>
                <strong className={styles.statusValue}>
                  {metricValue(pool ? (pool.unlocked ? "Trading enabled" : "Trading paused") : "Unavailable", poolLoading)}
                </strong>
                <p>State is read from the configured Soroban pool contract.</p>
              </article>
            </div>
          </div>
        </section>

        <section className={styles.ecosystemBand} aria-label="AstraX technology ecosystem">
          <div className={styles.container}>
            <p className={styles.ecosystemLabel}>Built with the Stellar ecosystem</p>
            <div className={styles.ecosystemGrid}>
              <a href="https://stellar.org" target="_blank" rel="noreferrer"><Network size={23} strokeWidth={1.5} aria-hidden="true" />Stellar</a>
              <a href="https://developers.stellar.org/docs/build/smart-contracts/overview" target="_blank" rel="noreferrer"><Code2 size={23} strokeWidth={1.5} aria-hidden="true" />Soroban</a>
              <a href="https://freighter.app" target="_blank" rel="noreferrer"><WalletCards size={23} strokeWidth={1.5} aria-hidden="true" />Freighter</a>
              <span><Coins size={23} strokeWidth={1.5} aria-hidden="true" />XLM / USDC</span>
            </div>
          </div>
        </section>

        <section className={styles.section}>
          <div className={styles.container}>
            <SectionIntro
              label="Pool fee"
              title="One fee tier, clearly defined."
              description="AstraX currently exposes the fee configured by the live XLM / USDC pool. No unsupported tiers are advertised."
              align="center"
            />
            <div className={styles.feeLayout}>
              <article className={styles.feeCard}>
                <p>Live pool</p>
                <strong>{feePercent.toFixed(2)}%</strong>
                <h3>XLM / USDC</h3>
                <ul>
                  <li><Check size={16} aria-hidden="true" />Contract-backed fee value</li>
                  <li><Check size={16} aria-hidden="true" />Used by swaps and LP positions</li>
                  <li><Check size={16} aria-hidden="true" />No subscription or platform plan</li>
                </ul>
                <Link className={styles.primaryButton} href="/liquidity">View Pool<ArrowUpRight size={16} aria-hidden="true" /></Link>
              </article>
              <div className={styles.feeContext}>
                <Gauge size={30} strokeWidth={1.4} aria-hidden="true" />
                <h3>Flexible strategy starts with the range.</h3>
                <p>The current contract uses a single fee tier. Liquidity providers still choose the price range and capital allocation for each position.</p>
              </div>
            </div>
          </div>
        </section>

        <section className={styles.section}>
          <div className={`${styles.container} ${styles.lpGrid}`}>
            <div className={styles.lpVisual} aria-hidden="true">
              <div className={styles.rangePlot}>
                <span className={styles.rangeLine} />
                <span className={styles.rangeBand} />
                <span className={styles.rangeMarker} />
              </div>
              <div className={styles.lpStatRow}><span>Selected range</span><strong>Position-led</strong></div>
            </div>
            <div className={styles.lpCopy}>
              <p className={styles.eyebrow}>For liquidity providers</p>
              <h2>Designed for focused, active liquidity.</h2>
              <p>Set a range, monitor its status and manage the position from the portfolio without giving up wallet custody.</p>
              <div className={styles.capabilityGrid}>
                {lpCapabilities.map((capability) => (
                  <span key={capability}><Check size={15} aria-hidden="true" />{capability}</span>
                ))}
              </div>
              <Link className={styles.secondaryButton} href="/liquidity/new">Create Position</Link>
            </div>
          </div>
        </section>

        <section className={styles.section} id="insights">
          <div className={styles.container}>
            <SectionIntro
              title="Latest insights and updates"
              description="A practical introduction to AstraX, concentrated liquidity and the Stellar smart-contract stack."
            />
            <div className={styles.insightGrid}>
              {insights.map(({ icon: Icon, title, description }, index) => (
                <article key={title} className={styles.insightCard}>
                  <div className={`${styles.insightVisual} ${styles[`insightVisual${index + 1}`]}`}>
                    <Icon size={36} strokeWidth={1.2} aria-hidden="true" />
                  </div>
                  <div>
                    <span>{index === 0 ? "Liquidity" : index === 1 ? "Network" : "Guide"}</span>
                    <h3>{title}</h3>
                    <p>{description}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className={styles.section} aria-labelledby="faq-title">
          <div className={`${styles.container} ${styles.faqGrid}`}>
            <div className={styles.faqIntro}>
              <BookOpen size={28} strokeWidth={1.4} aria-hidden="true" />
              <h2 id="faq-title">Frequently asked questions</h2>
              <p>Core details about the pool, fees, custody and supported wallet.</p>
            </div>
            <div className={styles.faqList}>
              {faqs.map((faq, index) => {
                const expanded = openFaq === index;
                return (
                  <div key={faq.question} className={styles.faqItem}>
                    <button
                      type="button"
                      aria-expanded={expanded}
                      aria-controls={`faq-answer-${index}`}
                      onClick={() => setOpenFaq(expanded ? null : index)}
                    >
                      {faq.question}
                      <ChevronDown className={expanded ? styles.chevronOpen : ""} size={18} aria-hidden="true" />
                    </button>
                    {expanded && <p id={`faq-answer-${index}`}>{faq.answer}</p>}
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className={styles.finalCta}>
          <div className={styles.container}>
            <div className={styles.ctaInner}>
              <BrandMark compact />
              <div>
                <h2>Ready to unlock capital efficiency?</h2>
                <p>Provide concentrated liquidity or swap XLM / USDC through AstraX on Stellar.</p>
              </div>
              <Link className={styles.primaryButton} href="/swap">Launch App<ArrowUpRight size={16} aria-hidden="true" /></Link>
            </div>
          </div>
        </section>

        <footer className={styles.footer}>
          <div className={styles.container}>
            <div className={styles.footerTop}>
              <div className={styles.footerBrand}><BrandMark /><p>Concentrated liquidity DEX on Stellar Soroban.</p></div>
              <div className={styles.footerLinks}>
                <div><h3>Product</h3><Link href="/swap">Swap</Link><Link href="/liquidity">Liquidity</Link><Link href="/portfolio">Portfolio</Link></div>
                <div><h3>Resources</h3><Link href="#insights">Docs</Link><Link href="#learn">Learn</Link></div>
                <div><h3>Network</h3><a href="https://stellar.org" target="_blank" rel="noreferrer">Stellar</a><a href="https://developers.stellar.org/docs/build/smart-contracts/overview" target="_blank" rel="noreferrer">Soroban</a><a href="https://freighter.app" target="_blank" rel="noreferrer">Freighter</a></div>
              </div>
            </div>
            <div className={styles.footerBottom}><span>© 2026 AstraX</span><span>Built for Stellar</span></div>
          </div>
        </footer>
      </div>
    </main>
  );
}
