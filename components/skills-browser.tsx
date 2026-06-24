"use client";

import { useMemo, useState } from "react";
import type { Target } from "@/lib/types";
import { SkillCard, type SkillSummary } from "./skill-card";

const TARGET_LABELS: Record<Target, string> = { claude: "Claude", codex: "Codex" };

export function SkillsBrowser({
  skills,
  targets,
  tags,
}: {
  skills: SkillSummary[];
  targets: Target[];
  tags: string[];
}) {
  const [query, setQuery] = useState("");
  const [activeTarget, setActiveTarget] = useState<Target | null>(null);
  const [activeTag, setActiveTag] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return skills.filter((s) => {
      if (q && !`${s.name} ${s.description} ${s.tags.join(" ")}`.toLowerCase().includes(q)) return false;
      if (activeTarget && !s.targets.includes(activeTarget)) return false;
      if (activeTag && !s.tags.includes(activeTag)) return false;
      return true;
    });
  }, [skills, query, activeTarget, activeTag]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        {/* Target segmented control */}
        <div className="flex items-center gap-1 rounded-xl border border-card-border bg-card/60 p-1">
          <button
            type="button"
            onClick={() => setActiveTarget(null)}
            className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-colors ${
              activeTarget === null ? "bg-accent/20 text-accent" : "text-text-muted hover:text-text-secondary"
            }`}
          >
            All
          </button>
          {targets.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setActiveTarget((cur) => (cur === t ? null : t))}
              className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-colors ${
                activeTarget === t ? "bg-accent/20 text-accent" : "text-text-muted hover:text-text-secondary"
              }`}
            >
              {TARGET_LABELS[t]}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <svg
            width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search skills…"
            className="w-full rounded-xl border border-card-border bg-card/60 py-2 pl-10 pr-4 text-sm text-text-primary placeholder:text-text-muted/60 transition-colors focus:border-accent/40 focus:outline-none focus:ring-1 focus:ring-accent/20"
          />
        </div>
      </div>

      {tags.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          {tags.map((tag) => (
            <button
              key={tag}
              onClick={() => setActiveTag((cur) => (cur === tag ? null : tag))}
              className={`rounded-full px-2.5 py-0.5 text-xs transition-colors ${
                activeTag === tag
                  ? "bg-accent/20 text-accent ring-1 ring-inset ring-accent/30"
                  : "bg-card/60 text-text-muted ring-1 ring-inset ring-card-border hover:text-text-secondary"
              }`}
            >
              #{tag}
            </button>
          ))}
        </div>
      )}

      <p className="text-xs text-text-muted/70">
        {filtered.length} of {skills.length} skill{skills.length === 1 ? "" : "s"}
      </p>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-card-border p-12 text-center text-sm text-text-muted">
          No skills match your filters.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((s, i) => (
            <SkillCard key={s.slug} skill={s} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}
