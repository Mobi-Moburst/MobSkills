import type { Skill } from "@/lib/types";
import { getSkillCompleteness } from "@/lib/skill-health";

/**
 * Detail-page sidebar panel: confirms the skill passes schema validation (true by
 * construction — invalid skills never render) and nudges on optional-but-recommended
 * metadata via a completeness checklist. Server component; no interactivity.
 */
export function SkillHealth({ skill }: { skill: Skill }) {
  const { passed, total, checks } = getSkillCompleteness(skill);

  return (
    <section className="rounded-2xl border border-card-border bg-card/80 p-4 text-sm backdrop-blur-xl">
      <h2 className="mb-3 text-sm font-semibold text-text-primary">Skill health</h2>

      <div className="flex items-center gap-2 text-text-secondary">
        <CheckIcon className="text-positive" />
        <span>Passes validation</span>
      </div>

      <div className="mt-3 mb-2 flex items-center justify-between text-xs">
        <span className="text-text-muted">Completeness</span>
        <span className={passed === total ? "text-positive" : "text-text-secondary"}>
          {passed}/{total}
        </span>
      </div>

      <ul className="space-y-2">
        {checks.map((c) => (
          <li key={c.label} className="flex items-start gap-2">
            {c.ok ? (
              <CheckIcon className="mt-0.5 shrink-0 text-positive" />
            ) : (
              <span className="mt-0.5 shrink-0 text-text-muted" aria-hidden>
                ◦
              </span>
            )}
            <span className={c.ok ? "text-text-secondary" : "text-text-muted"}>
              {c.label}
              {!c.ok && <span className="mt-0.5 block text-xs text-text-muted/70">{c.hint}</span>}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}
