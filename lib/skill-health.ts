// Per-skill COMPLETENESS scoring — pure, framework-free (no "server-only").
//
// This is distinct from schema VALIDATION (lib/frontmatter.ts): any skill that
// renders has already passed the schema. These are soft nudges on the optional-but-
// recommended frontmatter the schema doesn't require — surfaced in the detail-page
// "Skill health" panel to encourage richer, more discoverable, agent-triggerable skills.

import type { Skill } from "./types";

export interface HealthCheck {
  label: string;
  ok: boolean;
  hint: string;
}

export interface SkillCompleteness {
  passed: number;
  total: number;
  checks: HealthCheck[];
}

// A description is "trigger-oriented" if it frames WHEN to use the skill — the signal
// agents key off to select it. Recognises the common lead-ins, not just "use when".
const TRIGGER_RE = /\buse\s+(when|whenever|after|before|if|to|for)\b/i;
const TRIGGER_WORD_RE = /\btrigger/i;

export function getSkillCompleteness(skill: Skill): SkillCompleteness {
  const checks: HealthCheck[] = [
    {
      label: "Owner specified",
      ok: skill.owner !== null,
      hint: "Add an `owner` email so there's a clear maintainer.",
    },
    {
      label: "Version set",
      ok: skill.version !== null,
      hint: "Set a semver `version` (e.g. 1.0.0) to track changes.",
    },
    {
      label: "Tagged",
      ok: skill.tags.length > 0,
      hint: "Add `tags` so the skill surfaces in catalog filters.",
    },
    {
      label: "Trigger-oriented description",
      ok: TRIGGER_RE.test(skill.description) || TRIGGER_WORD_RE.test(skill.description),
      hint: "Frame the description around when to use it (e.g. “Use when …”) so agents trigger it reliably.",
    },
  ];

  return {
    passed: checks.filter((c) => c.ok).length,
    total: checks.length,
    checks,
  };
}
