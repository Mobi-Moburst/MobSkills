import Link from "next/link";
import { notFound } from "next/navigation";
import { readFileSync } from "node:fs";
import path from "node:path";
import { getAllSkills, getSkill } from "@/lib/skills";
import { Markdown } from "@/components/markdown";
import { TargetBadge } from "@/components/target-badge";
import { ConsumeActions } from "@/components/consume-actions";

const REPO = process.env.GITHUB_REPO ?? "Mobi-Moburst/MobSkills";

export const dynamicParams = false;

export function generateStaticParams() {
  return getAllSkills().map((s) => ({ slug: s.slug }));
}

export default async function SkillDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const skill = getSkill(slug);
  if (!skill) notFound();

  // Re-read the raw SKILL.md (with frontmatter) for the copy action.
  const rawSkillMd = readFileSync(path.join(process.cwd(), "skills", slug, "SKILL.md"), "utf8");
  const installSnippet = `npx degit ${REPO}/skills/${slug} ~/.claude/skills/${slug}`;

  return (
    <div>
      <Link href="/skills" className="text-sm text-text-muted transition-colors hover:text-text-primary">
        ← All skills
      </Link>

      <div className="mt-4 grid grid-cols-1 gap-8 lg:grid-cols-[1fr_300px]">
        {/* Main content */}
        <article className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1
              className="text-2xl font-semibold tracking-tight text-text-primary"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              {skill.name}
            </h1>
            {skill.version && (
              <span className="rounded-md bg-surface px-2 py-0.5 text-sm text-text-muted">v{skill.version}</span>
            )}
            {skill.status === "deprecated" && (
              <span className="inline-flex items-center gap-1 rounded-full bg-negative/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-negative ring-1 ring-inset ring-negative/25">
                <span className="h-1.5 w-1.5 rounded-full bg-negative" />
                Deprecated
              </span>
            )}
          </div>
          <p className="mt-2 text-text-secondary">{skill.description}</p>

          <div className="mt-6 rounded-2xl border border-card-border bg-card/80 p-5 backdrop-blur-xl sm:p-7">
            <Markdown>{skill.body}</Markdown>
          </div>
        </article>

        {/* Sidebar */}
        <aside className="space-y-5">
          <section className="rounded-2xl border border-card-border bg-card/80 p-4 backdrop-blur-xl">
            <h2 className="mb-3 text-sm font-semibold text-text-primary">Get this skill</h2>
            <ConsumeActions
              slug={skill.slug}
              version={skill.version}
              skillMarkdown={rawSkillMd}
              installSnippet={installSnippet}
            />
          </section>

          <section className="rounded-2xl border border-card-border bg-card/80 p-4 text-sm backdrop-blur-xl">
            <h2 className="mb-3 text-sm font-semibold text-text-primary">Details</h2>
            <dl className="space-y-2.5 text-text-secondary">
              <Row label="Targets">
                <div className="flex flex-wrap justify-end gap-1">
                  {skill.targets.map((t) => (
                    <TargetBadge key={t} target={t} />
                  ))}
                </div>
              </Row>
              <Row label="Visibility">
                <span className="capitalize">{skill.visibility}</span>
              </Row>
              {skill.departments.length > 0 && <Row label="Departments">{skill.departments.join(", ")}</Row>}
              {skill.owner && <Row label="Owner">{skill.owner}</Row>}
              {skill.tags.length > 0 && (
                <Row label="Tags">
                  <div className="flex flex-wrap justify-end gap-1">
                    {skill.tags.map((tag) => (
                      <span key={tag} className="rounded bg-surface px-1.5 py-0.5 text-xs">#{tag}</span>
                    ))}
                  </div>
                </Row>
              )}
            </dl>
          </section>

          <section className="rounded-2xl border border-card-border bg-card/80 p-4 text-sm backdrop-blur-xl">
            <h2 className="mb-3 text-sm font-semibold text-text-primary">Files</h2>
            <ul className="space-y-1 text-xs text-text-muted" style={{ fontFamily: "var(--font-mono)" }}>
              {skill.files.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
            <a
              href={`https://github.com/${REPO}/tree/main/skills/${skill.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-block text-xs font-medium text-accent hover:underline"
            >
              Open in GitHub ↗
            </a>
          </section>
        </aside>
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="shrink-0 text-text-muted">{label}</dt>
      <dd className="text-right text-text-secondary">{children}</dd>
    </div>
  );
}
