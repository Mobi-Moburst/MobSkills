export type Target = "claude" | "codex";
export type Visibility = "public" | "internal" | "department";
export type SkillStatus = "active" | "deprecated";

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
  /** Markdown body of SKILL.md, frontmatter stripped. */
  body: string;
  /** Relative file paths inside the skill folder (e.g. "SKILL.md", "scripts/run.sh"). */
  files: string[];
}
