// Validates every skills/<slug>/SKILL.md frontmatter against schema/skill.schema.json.
// Also enforces that `name` matches the containing folder. Exits non-zero on any error.
import { readFileSync } from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { glob } from "glob";
import Ajv from "ajv";
import addFormats from "ajv-formats";

const schema = JSON.parse(readFileSync("schema/skill.schema.json", "utf8"));
const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);
const validate = ajv.compile(schema);

const files = await glob("skills/*/SKILL.md");
if (files.length === 0) {
  console.error("No skills found under skills/*/SKILL.md");
  process.exit(1);
}

let failed = 0;
for (const file of files) {
  const { data } = matter(readFileSync(file, "utf8"));
  const folder = path.basename(path.dirname(file));
  const problems = [];

  if (!validate(data)) {
    for (const e of validate.errors) {
      problems.push(`${e.instancePath || "(root)"} ${e.message}`);
    }
  }
  if (data.name && data.name !== folder) {
    problems.push(`name "${data.name}" must match folder "${folder}"`);
  }

  if (problems.length) {
    failed++;
    console.error(`✗ ${file}`);
    for (const p of problems) console.error(`    - ${p}`);
  } else {
    console.log(`✓ ${file} (${data.name})`);
  }
}

if (failed) {
  console.error(`\n${failed} skill(s) failed validation.`);
  process.exit(1);
}
console.log(`\nAll ${files.length} skill(s) valid.`);
