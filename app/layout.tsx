import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { DM_Sans, Outfit, Geist_Mono } from "next/font/google";
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
        <header className="sticky top-0 z-10 border-b border-card-border bg-background/80 backdrop-blur-xl">
          <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-5">
            <Link href="/skills" className="flex items-center gap-2.5">
              <Image
                src="/moburst-mark.png"
                alt="Moburst"
                width={28}
                height={28}
                className="rounded-lg"
                priority
              />
              <span
                className="text-lg font-semibold tracking-tight text-text-primary"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                MobSkills
              </span>
            </Link>
            <nav className="text-sm text-text-muted">
              <Link href="/skills" className="transition-colors hover:text-text-primary">
                Skills
              </Link>
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-5 py-8">{children}</main>
      </body>
    </html>
  );
}
