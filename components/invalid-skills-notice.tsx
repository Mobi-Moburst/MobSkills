import type { InvalidSkill } from "@/lib/skills";

const MAX_REASON_LEN = 120;

function shortReason(errors: string[]): string {
  const joined = errors.join("; ");
  return joined.length > MAX_REASON_LEN ? `${joined.slice(0, MAX_REASON_LEN - 1)}…` : joined;
}

/**
 * Compact, low-key strip listing skills that failed schema validation and were
 * dropped from the catalog — so a broken skill (and why) is visible, not silent.
 * Renders nothing when everything is valid. Not a dashboard, by design.
 */
export function InvalidSkillsNotice({ invalid, repo }: { invalid: InvalidSkill[]; repo: string }) {
  if (invalid.length === 0) return null;

  return (
    <div className="mt-8 rounded-2xl border border-negative/30 bg-card/40 p-4 backdrop-blur-xl">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-text-secondary">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-negative">
          <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
          <path d="M12 9v4M12 17h.01" />
        </svg>
        {invalid.length} skill{invalid.length > 1 ? "s" : ""} couldn&apos;t be indexed
      </h2>
      <ul className="mt-3 space-y-2">
        {invalid.map((s) => (
          <li key={s.slug} className="flex flex-wrap items-baseline gap-x-2 text-xs">
            <code className="font-medium text-text-secondary">{s.slug}</code>
            <span className="text-text-muted">— {shortReason(s.errors)}</span>
            <a
              href={`https://github.com/${repo}/blob/main/skills/${s.slug}/SKILL.md`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent hover:underline"
            >
              Open in GitHub ↗
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
