import "server-only";
import { readFileSync } from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import Ajv2020Import from "ajv/dist/2020.js";
import addFormatsImport from "ajv-formats";

// ESM/CJS default-interop (same dance the original lint script needed).
const Ajv2020 = (Ajv2020Import as unknown as { default?: typeof Ajv2020Import }).default ?? Ajv2020Import;
const addFormats = (addFormatsImport as unknown as { default?: typeof addFormatsImport }).default ?? addFormatsImport;

const ajv = new (Ajv2020 as typeof import("ajv/dist/2020").default)({
  allErrors: true,
  strict: false,
});
(addFormats as typeof import("ajv-formats").default)(ajv);

let validateSchema: ReturnType<typeof ajv.compile>;
try {
  const schema = JSON.parse(
    readFileSync(path.join(process.cwd(), "schema", "skill.schema.json"), "utf8"),
  );
  validateSchema = ajv.compile(schema);
} catch (err) {
  throw new Error(`MobSkills: failed to load/compile schema/skill.schema.json — ${String(err)}`);
}

export interface ParsedSkill {
  data: Record<string, unknown>;
  body: string;
  valid: boolean;
  errors: string[];
}

/**
 * Parse + validate a raw SKILL.md against schema/skill.schema.json.
 * `folder` (optional) enforces that frontmatter `name` matches the folder name.
 * This is the single validation path reused by the catalog and (later) sync.
 */
export function parseSkill(raw: string, folder?: string): ParsedSkill {
  const { data, content } = matter(raw);
  const errors: string[] = [];

  if (!validateSchema(data)) {
    for (const e of validateSchema.errors ?? []) {
      errors.push(`${e.instancePath || "(root)"} ${e.message ?? "invalid"}`);
    }
  }
  if (folder && typeof data.name === "string" && data.name !== folder) {
    errors.push(`name "${data.name}" must match folder "${folder}"`);
  }

  return { data: data as Record<string, unknown>, body: content, valid: errors.length === 0, errors };
}
