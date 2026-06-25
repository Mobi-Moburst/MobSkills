import Link from "next/link";
import { getFacets } from "@/lib/skills";
import { SkillGenerator } from "@/components/skill-generator";

export const dynamic = "force-static";

const REPO = process.env.GITHUB_REPO ?? "Mobi-Moburst/MobSkills";

export default function NewSkillPage() {
  const { tags } = getFacets();

  return (
    <div>
      {/* Header */}
      <div className="mb-7">
        <Link
          href="/skills"
          className="mb-3 inline-flex items-center gap-1 text-xs font-medium text-text-muted transition hover:text-text-secondary"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m15 18-6-6 6-6" />
          </svg>
          Skills Library
        </Link>
        <h1
          className="text-2xl font-semibold tracking-tight text-text-primary"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          New skill
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-text-muted">
          Fill in the fields and get a schema-valid <code className="text-text-secondary">SKILL.md</code> —
          copy it, download it, or open a prefilled pull request on GitHub.
        </p>
      </div>

      <SkillGenerator repo={REPO} knownTags={tags} />
    </div>
  );
}
