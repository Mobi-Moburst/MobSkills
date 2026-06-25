// Pure, framework-free helpers for the guided skill generator (/skills/new).
// No "server-only" — this runs in the client form too.
//
// Validation rules and field patterns mirror schema/skill.schema.json (the single
// source of truth). We import the regex/length constants straight from it so the two
// can't drift; the control flow (conditional `departments`) is spelled out by hand
// because that's clearer than dragging Ajv into the client bundle.

import schema from "@/schema/skill.schema.json";
import type { Target, Runtime, Visibility } from "./types";

const props = schema.properties as Record<string, { pattern?: string; minLength?: number }>;
const NAME_PATTERN = new RegExp(props.name.pattern!);
const VERSION_PATTERN = new RegExp(props.version.pattern!);
const DESCRIPTION_MIN = props.description.minLength ?? 20;

/** Raw form state — arrays the user types as comma-separated text. */
export interface SkillFormInput {
  name: string;
  description: string;
  targets: Target[];
  runtime: Runtime;
  visibility: Visibility;
  departments: string; // comma-separated
  tags: string; // comma-separated
  owner: string;
  version: string;
}

export type SkillField = keyof SkillFormInput;
export type SkillErrors = Partial<Record<SkillField, string>>;

export function emptySkillInput(): SkillFormInput {
  return {
    name: "",
    description: "",
    targets: ["claude"],
    runtime: "local",
    visibility: "internal",
    departments: "",
    tags: "",
    owner: "",
    version: "1.0.0",
  };
}

/** Split a comma/newline separated list into trimmed, de-duped, non-empty items. */
export function parseList(raw: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of raw.split(/[,\n]/)) {
    const item = part.trim();
    if (item && !seen.has(item)) {
      seen.add(item);
      out.push(item);
    }
  }
  return out;
}

/** Field-keyed validation that mirrors the JSON Schema. Empty object = valid. */
export function validateSkillInput(input: SkillFormInput): SkillErrors {
  const errors: SkillErrors = {};

  if (!input.name.trim()) {
    errors.name = "Required.";
  } else if (!NAME_PATTERN.test(input.name)) {
    errors.name = "Must be kebab-case (lowercase letters, digits, single hyphens).";
  }

  const desc = input.description.trim();
  if (!desc) {
    errors.description = "Required.";
  } else if (desc.length < DESCRIPTION_MIN) {
    errors.description = `At least ${DESCRIPTION_MIN} characters (currently ${desc.length}).`;
  }

  if (input.targets.length === 0) {
    errors.targets = "Pick at least one target.";
  }

  if (input.version.trim() && !VERSION_PATTERN.test(input.version.trim())) {
    errors.version = "Use semantic version, e.g. 1.0.0.";
  }

  if (input.visibility === "department" && parseList(input.departments).length === 0) {
    errors.departments = "Required when visibility is “department”.";
  }

  if (input.owner.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.owner.trim())) {
    errors.owner = "Must be a valid email.";
  }

  return errors;
}

// --- YAML emission -----------------------------------------------------------

/** Emit a YAML scalar, double-quoting only when a bare value would be misparsed. */
function yamlScalar(v: string): string {
  const needsQuote =
    v.length === 0 ||
    /^[\s>|@`"'%#&*!?[\]{},-]/.test(v) || // leading indicator char
    /[[\]{},]/.test(v) || // flow-collection chars anywhere (safe inside [ ] arrays)
    /\s$/.test(v) || // trailing whitespace
    /:(\s|$)/.test(v) || // colon that starts a mapping
    /\s#/.test(v) || // inline-comment marker
    /["\\\n\t]/.test(v) || // quotes / escapes / control
    /^(true|false|null|yes|no|on|off|~)$/i.test(v) ||
    /^[-+]?[\d.]+$/.test(v); // looks numeric
  if (!needsQuote) return v;
  return `"${v.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n")}"`;
}

function yamlFlowArray(items: string[]): string {
  return `[${items.map(yamlScalar).join(", ")}]`;
}

/** Build the full SKILL.md text (frontmatter + scaffolded body) from form input. */
export function buildSkillMarkdown(input: SkillFormInput): string {
  const name = input.name.trim() || "new-skill";
  const description = input.description.trim();
  const departments = parseList(input.departments);
  const tags = parseList(input.tags);
  const owner = input.owner.trim();
  const version = input.version.trim();

  const lines: string[] = ["---"];
  lines.push(`name: ${yamlScalar(name)}`);
  lines.push(`description: ${yamlScalar(description)}`);
  lines.push(`targets: ${yamlFlowArray(input.targets)}`);
  lines.push(`runtime: ${input.runtime}`);
  if (version) lines.push(`version: ${version}`);
  lines.push(`visibility: ${input.visibility}`);
  if (input.visibility === "department") lines.push(`departments: ${yamlFlowArray(departments)}`);
  if (tags.length) lines.push(`tags: ${yamlFlowArray(tags)}`);
  if (owner) lines.push(`owner: ${yamlScalar(owner)}`);
  lines.push("---");

  const body = `
# /${name}

${description || "One-line summary of what this skill does and the outcome it produces."}

## Trigger

User runs \`/${name}\` or asks for ${tags[0] ?? "this"}.

## Inputs

Gather the following from the user. If not provided, ask before proceeding:

1. **Input one** — what it is and why it's needed.

## Steps

1. First step.
2. Second step.

## Output

Describe what the skill produces and the format it's delivered in.
`;

  return lines.join("\n") + "\n" + body.replace(/^\n/, "") + "\n";
}

/**
 * GitHub "create new file" URL, prefilled with filename + content.
 * GitHub truncates very long `value` params (~8KB practical limit), so callers
 * should fall back to copy/paste when the content exceeds GITHUB_PREFILL_LIMIT.
 */
export const GITHUB_PREFILL_LIMIT = 6000;

export function githubNewFileUrl(repo: string, input: SkillFormInput, content: string): string {
  const name = input.name.trim() || "new-skill";
  const params = new URLSearchParams({
    filename: `skills/${name}/SKILL.md`,
    value: content,
  });
  return `https://github.com/${repo}/new/main?${params.toString()}`;
}
