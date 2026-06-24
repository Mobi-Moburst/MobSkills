import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { DM_Sans, Outfit, Geist_Mono } from "next/font/google";
import { Sidebar } from "@/components/sidebar";
import { CosmicBackground } from "@/components/cosmic-background";
import "./globals.css";

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});
const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});
const geistMono = Geist_Mono({ variable: "--font-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "MobSkills — Moburst Skills Library",
  description: "Discover, manage, and version Moburst's agent skills for Claude and Codex.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${dmSans.variable} ${outfit.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        {/* Cosmic background (testing) — full-bleed behind everything */}
        <div className="fixed inset-0 z-0 overflow-hidden">
          <CosmicBackground />
        </div>

        <div className="relative z-10">
          <Sidebar />

          {/* Mobile top bar (sidebar is hidden < md) */}
          <header className="sticky top-0 z-10 flex h-14 items-center border-b border-card-border bg-background/80 px-5 backdrop-blur-xl md:hidden">
            <Link href="/skills" className="flex items-center gap-2.5">
              <Image src="/moburst-mark.png" alt="Moburst" width={26} height={26} className="rounded-lg" priority />
              <span className="text-lg font-semibold tracking-tight text-text-primary" style={{ fontFamily: "var(--font-heading)" }}>
                MobSkills
              </span>
            </Link>
          </header>

          <div className="md:pl-60">
            {/* Left-aligned (no mx-auto) so content sits next to the sidebar
                instead of floating to screen-center on wide displays. */}
            <main className="max-w-7xl px-6 py-8 lg:px-10">{children}</main>
          </div>
        </div>
      </body>
    </html>
  );
}
