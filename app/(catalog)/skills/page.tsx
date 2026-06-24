import { getAllSkills, getFacets } from "@/lib/skills";
import { SkillsBrowser } from "@/components/skills-browser";
import type { SkillSummary } from "@/components/skill-card";

export const dynamic = "force-static";

export default function SkillsPage() {
  const skills = getAllSkills();
  const { targets, tags } = getFacets();

  // Strip heavy fields (body/files) before handing to the client browser.
  const summaries: SkillSummary[] = skills.map((s) => {
    const { body, files, ...rest } = s;
    void body;
    void files;
    return rest;
  });

  return (
    <div>
      <div className="mb-6">
        <h1
          className="text-2xl font-semibold tracking-tight text-text-primary"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          Skills Library
        </h1>
        <p className="mt-1 text-sm text-text-muted">
          Moburst&apos;s agent skills for Claude and Codex — browse, filter, and download.
        </p>
      </div>
      <SkillsBrowser skills={summaries} targets={targets} tags={tags} />
    </div>
  );
}
