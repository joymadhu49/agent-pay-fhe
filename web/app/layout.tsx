import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { Providers } from "../lib/providers";
import { ConnectButton } from "@rainbow-me/rainbowkit";

export const metadata: Metadata = {
  title: "agent-pay-fhe",
  description: "Confidential AI-agent payments on Zama FHEVM.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <header className="flex items-center justify-between p-4 border-b border-neutral-800">
            <nav className="flex items-center gap-4 text-sm">
              <Link href="/" className="font-semibold">agent-pay-fhe</Link>
              <Link href="/agents">Agents</Link>
              <Link href="/register">Register</Link>
              <Link href="/me">My wallet</Link>
            </nav>
            <ConnectButton showBalance={false} chainStatus="icon" />
          </header>
          <main className="max-w-4xl mx-auto p-6">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
