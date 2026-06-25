import "server-only";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { parseSkill } from "./frontmatter";
import type { Skill, Target, Visibility, SkillStatus, Runtime } from "./types";

const SKILLS_DIR = path.join(process.cwd(), "skills");

function listFilesRecursive(dir: string, base = dir): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listFilesRecursive(full, base));
    else out.push(path.relative(base, full));
  }
  return out.sort();
}

export interface InvalidSkill {
  slug: string;
  errors: string[];
}

let cache: { skills: Skill[]; invalid: InvalidSkill[] } | null = null;

/**
 * Read every skills/<slug>/SKILL.md from the local repo, validate frontmatter,
 * and return the valid skills (+ the invalid ones with their errors).
 * Phase 1 reads the colocated filesystem; Phase 2 swaps in GitHub + a Postgres cache.
 */
export function loadSkills(): { skills: Skill[]; invalid: InvalidSkill[] } {
  // Cache for prod (read once at build); always re-read in dev so editing a
  // SKILL.md reflects without a server restart.
  if (cache && process.env.NODE_ENV !== "development") return cache;
  const skills: Skill[] = [];
  const invalid: InvalidSkill[] = [];

  if (existsSync(SKILLS_DIR)) {
    for (const entry of readdirSync(SKILLS_DIR, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const slug = entry.name;
      const skillMd = path.join(SKILLS_DIR, slug, "SKILL.md");
      if (!existsSync(skillMd)) continue;

      const parsed = parseSkill(readFileSync(skillMd, "utf8"), slug);
      if (!parsed.valid) {
        invalid.push({ slug, errors: parsed.errors });
        continue;
      }
      const d = parsed.data;
      skills.push({
        slug,
        name: String(d.name),
        description: String(d.description),
        targets: (d.targets as Target[]) ?? [],
        version: (d.version as string) ?? null,
        visibility: ((d.visibility as Visibility) ?? "internal"),
        departments: (d.departments as string[]) ?? [],
        tags: (d.tags as string[]) ?? [],
        owner: (d.owner as string) ?? null,
        status: ((d.status as SkillStatus) ?? "active"),
        runtime: ((d.runtime as Runtime) ?? "local"),
        body: parsed.body,
        files: listFilesRecursive(path.join(SKILLS_DIR, slug)),
      });
    }
  }

  skills.sort((a, b) => a.name.localeCompare(b.name));

  // Surface dropped skills — the lint CI used to catch these; now sync/build does.
  if (invalid.length) {
    for (const { slug, errors } of invalid) {
      console.warn(`[mobskills] skipped invalid skill "${slug}": ${errors.join("; ")}`);
    }
  }

  cache = { skills, invalid };
  return cache;
}

export function getAllSkills(): Skill[] {
  return loadSkills().skills;
}

export function getSkill(slug: string): Skill | null {
  return loadSkills().skills.find((s) => s.slug === slug) ?? null;
}

/**
 * Hard cap on the inline zip download — kept under Vercel's 4.5 MB response limit.
 * Shared by the download route (enforces 413) and the detail page (hides the button).
 */
export const MAX_DOWNLOAD_BYTES = 4 * 1024 * 1024;

/** Total bytes of a skill folder, for the download size guard + UI. Cheap stat, no reads. */
export function getSkillSizeBytes(slug: string): number {
  const dir = path.join(SKILLS_DIR, slug);
  if (!existsSync(dir)) return 0;
  return listFilesRecursive(dir).reduce((n, rel) => n + statSync(path.join(dir, rel)).size, 0);
}

/** Read the raw bytes of every file in a skill folder — used to build the download zip. */
export function readSkillFiles(slug: string): { path: string; content: Buffer }[] {
  const dir = path.join(SKILLS_DIR, slug);
  if (!existsSync(dir)) return [];
  return listFilesRecursive(dir).map((rel) => ({
    path: rel,
    content: readFileSync(path.join(dir, rel)),
  }));
}

/** Distinct targets/tags across all skills, for filter UIs. */
export function getFacets(): { targets: Target[]; tags: string[] } {
  const skills = getAllSkills();
  const targets = new Set<Target>();
  const tags = new Set<string>();
  for (const s of skills) {
    s.targets.forEach((t) => targets.add(t));
    s.tags.forEach((t) => tags.add(t));
  }
  return { targets: [...targets].sort(), tags: [...tags].sort() };
}
