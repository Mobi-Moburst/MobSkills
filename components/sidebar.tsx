"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

type NavItem = {
  label: string;
  href: string;
  icon: React.ReactNode;
  soon?: boolean;
};

const NAV: NavItem[] = [
  {
    label: "Skills",
    href: "/skills",
    icon: (
      <path d="M5 3 4 8l-1 0 2 9 6 0 6 0 2-9-1 0-1-5-5 4-3-5-3 5-3-4Z" />
    ),
  },
  {
    label: "Version control",
    href: "/versions",
    soon: true,
    icon: (
      <>
        <line x1="6" y1="3" x2="6" y2="15" />
        <circle cx="18" cy="6" r="3" />
        <circle cx="6" cy="18" r="3" />
        <path d="M18 9a9 9 0 0 1-9 9" />
      </>
    ),
  },
  {
    label: "Analytics",
    href: "/analytics",
    soon: true,
    icon: (
      <>
        <path d="M3 3v18h18" />
        <rect x="7" y="11" width="3" height="6" />
        <rect x="13" y="7" width="3" height="10" />
      </>
    ),
  },
  {
    label: "Departments",
    href: "/departments",
    soon: true,
    icon: (
      <>
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      </>
    ),
  },
  {
    label: "Admin",
    href: "/admin",
    soon: true,
    icon: (
      <>
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
      </>
    ),
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 hidden w-60 flex-col border-r border-card-border bg-card/40 px-3 py-4 backdrop-blur-xl md:flex">
      <Link href="/skills" className="mb-7 flex items-center gap-2.5 px-2">
        <Image src="/moburst-mark.png" alt="Moburst" width={28} height={28} className="rounded-lg" priority />
        <span className="text-lg font-semibold tracking-tight text-text-primary" style={{ fontFamily: "var(--font-heading)" }}>
          MobSkills
        </span>
      </Link>

      <nav className="flex flex-col gap-1">
        {NAV.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const base =
            "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors";
          if (item.soon) {
            return (
              <div
                key={item.label}
                className={`${base} cursor-default text-text-muted/50`}
                title="Coming in a later phase"
              >
                <Icon>{item.icon}</Icon>
                <span>{item.label}</span>
                <span className="ml-auto rounded-full bg-card-border/60 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-text-muted">
                  Soon
                </span>
              </div>
            );
          }
          return (
            <Link
              key={item.label}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`${base} ${
                active
                  ? "bg-accent/15 text-accent"
                  : "text-text-secondary hover:bg-card-hover hover:text-text-primary"
              }`}
            >
              <Icon>{item.icon}</Icon>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

function Icon({ children }: { children: React.ReactNode }) {
  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="shrink-0"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}
