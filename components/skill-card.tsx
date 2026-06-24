import Link from "next/link";
import type { Skill } from "@/lib/types";
import { TargetBadge } from "./target-badge";

export type SkillSummary = Omit<Skill, "body" | "files">;

export function SkillCard({ skill, index }: { skill: SkillSummary; index: number }) {
  return (
    <Link
      href={`/skills/${skill.slug}`}
      className="animate-fade-in-up group relative flex flex-col rounded-2xl border border-card-border bg-card/40 p-6 backdrop-blur-xl transition-all duration-300 hover:-translate-y-0.5 hover:border-accent/40 hover:bg-card/60 hover:shadow-xl hover:shadow-accent/5"
      style={{ animationDelay: `${index * 70}ms`, animationFillMode: "both" }}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-accent/25 bg-accent/10">
          <span className="text-xl leading-none">✨</span>
        </div>
        <div className="min-w-0 flex-1">
          <h2
            className="line-clamp-2 text-base font-semibold leading-snug text-text-primary transition-colors group-hover:text-accent"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            {skill.name}
          </h2>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {skill.targets.map((t) => (
              <TargetBadge key={t} target={t} />
            ))}
            {skill.status === "deprecated" && (
              <span className="inline-flex items-center gap-1 rounded-full bg-negative/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-negative ring-1 ring-inset ring-negative/25">
                <span className="h-1.5 w-1.5 rounded-full bg-negative" />
                Deprecated
              </span>
            )}
          </div>
        </div>
        {skill.version && (
          <span className="shrink-0 rounded-md bg-surface px-1.5 py-0.5 text-xs text-text-muted">
            v{skill.version}
          </span>
        )}
      </div>

      <p className="mt-4 line-clamp-2 text-sm leading-relaxed text-text-secondary/90">
        {skill.description}
      </p>

      <div className="mt-auto pt-5">
        <div className="flex items-center justify-between gap-3 border-t border-card-border/60 pt-3">
          <div className="flex flex-wrap gap-1.5">
            {skill.tags.slice(0, 3).map((tag) => (
              <span key={tag} className="text-[11px] text-text-muted">
                #{tag}
              </span>
            ))}
            {skill.tags.length === 0 && (
              <span className="text-[11px] capitalize text-text-muted/60">{skill.visibility}</span>
            )}
          </div>
          <span className="inline-flex shrink-0 items-center gap-1 text-[11px] font-medium text-accent opacity-0 transition-opacity group-hover:opacity-100">
            Open
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14" />
              <path d="m12 5 7 7-7 7" />
            </svg>
          </span>
        </div>
      </div>
    </Link>
  );
}
