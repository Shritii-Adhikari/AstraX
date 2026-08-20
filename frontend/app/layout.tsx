import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import Providers from "@/context/Providers";
import WalletModal from "@/components/wallet/WalletModal";
import TxStatusModal from "@/components/wallet/TxStatusModal";

import { Inter } from "next/font/google";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
  weight: ["300", "400", "500", "600", "700"],
});

const geist = localFont({
  src: "./fonts/geist-sans.woff2",
  variable: "--font-geist",
  display: "swap",
  weight: "100 900",
});

const geistMono = localFont({
  src: "./fonts/geist-mono.woff2",
  variable: "--font-geist-mono",
  display: "swap",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "AstraX | Concentrated Liquidity on Stellar",
  description:
    "AstraX is a concentrated liquidity DEX for XLM and USDC, built on Stellar Soroban.",
  icons: {
    icon: "/astrax-chrome-a.png",
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
        className={`${inter.variable} ${geist.variable} ${geistMono.variable} font-sans antialiased`}
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
