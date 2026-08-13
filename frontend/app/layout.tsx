import type { Metadata } from "next";
import { Instrument_Sans, Instrument_Serif, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import Providers from "@/context/Providers";
import WalletModal from "@/components/wallet/WalletModal";
import TxStatusModal from "@/components/wallet/TxStatusModal";

const instrumentSans = Instrument_Sans({
  subsets: ["latin"],
  variable: "--font-instrument",
});

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-instrument-serif",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
});

export const metadata: Metadata = {
  title: "LuminaDex — Stellar CLMM DEX",
  description:
    "Trade with concentrated liquidity, tight spreads, and instant settlement — fully non-custodial on Stellar Soroban.",
  icons: {
    icon: "/lumina-logo.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${instrumentSans.variable} ${instrumentSerif.variable} ${jetbrainsMono.variable} font-sans antialiased`}
      >
        <Providers>
          {children}
          <WalletModal />
          <TxStatusModal />
        </Providers>
      </body>
    </html>
  );
}
