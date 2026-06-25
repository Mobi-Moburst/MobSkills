export type Target = "claude" | "codex";
export type Visibility = "public" | "internal" | "department";
export type SkillStatus = "active" | "deprecated";
/** Where a skill runs: hosted = Anthropic cloud sandbox (claude.ai/Desktop); local = anywhere (Claude Code CLI, Codex). */
export type Runtime = "hosted" | "local";

export interface SkillFrontmatter {
  name: string;
  description: string;
  targets: Target[];
  version?: string;
  visibility?: Visibility;
  departments?: string[];
  tags?: string[];
  owner?: string;
  status?: SkillStatus;
  runtime?: Runtime;
}

export interface Skill {
  slug: string;
  name: string;
  description: string;
  targets: Target[];
  version: string | null;
  visibility: Visibility;
  departments: string[];
  tags: string[];
  owner: string | null;
  status: SkillStatus;
  runtime: Runtime;
  /** Markdown body of SKILL.md, frontmatter stripped. */
  body: string;
  /** Relative file paths inside the skill folder (e.g. "SKILL.md", "scripts/run.sh"). */
  files: string[];
}
