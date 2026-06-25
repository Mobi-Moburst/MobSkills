import Link from "next/link";
import { loadSkills, getFacets } from "@/lib/skills";
import { SkillsBrowser } from "@/components/skills-browser";
import { InvalidSkillsNotice } from "@/components/invalid-skills-notice";
import type { SkillSummary } from "@/components/skill-card";

export const dynamic = "force-static";

const REPO = process.env.GITHUB_REPO ?? "Mobi-Moburst/MobSkills";

export default function SkillsPage() {
  const { skills, invalid } = loadSkills();
  const { targets, tags } = getFacets();

  const summaries: SkillSummary[] = skills.map((s) => {
    const { body, files, ...rest } = s;
    void body;
    void files;
    return rest;
  });

  const newSkillHref = "/skills/new";

  // Colors come from the design tokens (globals.css @theme); color-mix builds
  // the tint/border alpha so we never hardcode off-palette hex.
  const stats = [
    {
      label: "Skills",
      value: skills.length,
      token: "--color-accent",
      icon: <><path d="M12 2 2 7l10 5 10-5-10-5Z" /><path d="m2 17 10 5 10-5" /><path d="m2 12 10 5 10-5" /></>,
    },
    {
      label: "For Claude",
      value: skills.filter((s) => s.targets.includes("claude")).length,
      token: "--color-claude",
      icon: <><path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z" /></>,
    },
    {
      label: "For Codex",
      value: skills.filter((s) => s.targets.includes("codex")).length,
      token: "--color-codex",
      icon: <><path d="m16 18 6-6-6-6" /><path d="m8 6-6 6 6 6" /></>,
    },
    {
      label: "Tags",
      value: tags.length,
      token: "--color-info",
      icon: <><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" /><path d="M9 3h6v4H9z" /></>,
    },
  ];

  return (
    <div>
      {/* Header */}
      <div className="mb-7 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1
            className="text-2xl font-semibold tracking-tight text-text-primary"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            Skills Library
          </h1>
          <p className="mt-1 text-sm text-text-muted">
            Moburst&apos;s agent skills for Claude and Codex — browse, filter, and download.
          </p>
        </div>
        <Link
          href={newSkillHref}
          className="inline-flex items-center gap-1.5 rounded-lg border border-card-border bg-card/40 px-3 py-2 text-sm font-medium text-text-secondary backdrop-blur-xl transition hover:border-accent/40 hover:text-text-primary"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
          New skill
        </Link>
      </div>

      {/* Stats strip */}
      <div className="mb-7 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((s, i) => {
          const c = `var(${s.token})`;
          return (
            <div
              key={s.label}
              className="animate-fade-in-up flex items-center gap-3 rounded-2xl border border-card-border bg-card/40 p-4 backdrop-blur-xl"
              style={{ animationDelay: `${i * 60}ms`, animationFillMode: "both" }}
            >
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                style={{
                  backgroundColor: `color-mix(in srgb, ${c} 12%, transparent)`,
                  border: `1px solid color-mix(in srgb, ${c} 25%, transparent)`,
                  color: c,
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  {s.icon}
                </svg>
              </div>
              <div className="min-w-0">
                <p
                  className="text-xl font-semibold leading-none text-text-primary"
                  style={{ fontFamily: "var(--font-heading)" }}
                >
                  {s.value}
                </p>
                <p className="mt-1 text-[11px] font-medium uppercase tracking-wider text-text-muted">
                  {s.label}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <SkillsBrowser skills={summaries} targets={targets} tags={tags} newSkillHref={newSkillHref} />

      <InvalidSkillsNotice invalid={invalid} repo={REPO} />
    </div>
  );
}
