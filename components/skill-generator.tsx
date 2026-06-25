"use client";

import { cloneElement, isValidElement, useId, useMemo, useState, type ReactElement } from "react";
import Link from "next/link";
import type { Target, Runtime, Visibility } from "@/lib/types";
import {
  buildSkillMarkdown,
  emptySkillInput,
  githubNewFileUrl,
  validateSkillInput,
  GITHUB_PREFILL_LIMIT,
  type SkillFormInput,
} from "@/lib/skill-template";

const TARGETS: Target[] = ["claude", "codex"];
const RUNTIMES: { value: Runtime; label: string; hint: string }[] = [
  { value: "local", label: "Local", hint: "Claude Code CLI, Codex — runs anywhere" },
  { value: "hosted", label: "Hosted", hint: "Anthropic cloud sandbox (claude.ai / Desktop)" },
];
const VISIBILITIES: { value: Visibility; label: string }[] = [
  { value: "internal", label: "Internal" },
  { value: "public", label: "Public" },
  { value: "department", label: "Department" },
];

const fieldClass =
  "w-full rounded-lg border border-card-border bg-card/40 px-3 py-2 text-sm text-text-primary placeholder:text-text-muted/50 backdrop-blur-xl outline-none transition focus:border-accent/50";
const labelClass = "block text-xs font-medium uppercase tracking-wider text-text-muted";

export function SkillGenerator({ repo, knownTags }: { repo: string; knownTags: string[] }) {
  const [input, setInput] = useState<SkillFormInput>(emptySkillInput);
  const [copied, setCopied] = useState(false);

  const errors = useMemo(() => validateSkillInput(input), [input]);
  const markdown = useMemo(() => buildSkillMarkdown(input), [input]);
  const isValid = Object.keys(errors).length === 0;
  const tooLongForPrefill = markdown.length > GITHUB_PREFILL_LIMIT;
  const githubUrl = useMemo(() => githubNewFileUrl(repo, input, markdown), [repo, input, markdown]);

  function set<K extends keyof SkillFormInput>(key: K, value: SkillFormInput[K]) {
    setInput((prev) => ({ ...prev, [key]: value }));
    setCopied(false);
  }

  function toggleTarget(t: Target) {
    setInput((prev) => ({
      ...prev,
      targets: prev.targets.includes(t) ? prev.targets.filter((x) => x !== t) : [...prev.targets, t],
    }));
    setCopied(false);
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(markdown);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard blocked (denied permission / insecure context) — leave the label unchanged.
    }
  }

  function download() {
    const blob = new Blob([markdown], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "SKILL.md";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {/* Form */}
      <form className="space-y-5" onSubmit={(e) => e.preventDefault()}>
        <Field label="Name" error={errors.name} hint="kebab-case; becomes the folder skills/<name>/">
          <input
            className={fieldClass}
            placeholder="my-skill"
            value={input.name}
            onChange={(e) => set("name", e.target.value)}
          />
        </Field>

        <Field
          label="Description"
          error={errors.description}
          hint="Trigger-oriented — “Use when …”. This is how agents pick the skill."
        >
          <textarea
            className={`${fieldClass} min-h-[88px] resize-y`}
            placeholder="Use when … — what it does and the outcome it produces."
            value={input.description}
            onChange={(e) => set("description", e.target.value)}
          />
        </Field>

        <Field label="Targets" error={errors.targets}>
          <div className="flex gap-2">
            {TARGETS.map((t) => {
              const on = input.targets.includes(t);
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => toggleTarget(t)}
                  className={`rounded-lg border px-3 py-1.5 text-sm capitalize transition ${
                    on
                      ? "border-accent/50 bg-accent/10 text-text-primary"
                      : "border-card-border bg-card/40 text-text-secondary hover:text-text-primary"
                  }`}
                >
                  {t}
                </button>
              );
            })}
          </div>
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Runtime">
            <select className={fieldClass} value={input.runtime} onChange={(e) => set("runtime", e.target.value as Runtime)}>
              {RUNTIMES.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label} — {r.hint}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Version" error={errors.version}>
            <input className={fieldClass} placeholder="1.0.0" value={input.version} onChange={(e) => set("version", e.target.value)} />
          </Field>
        </div>

        <Field label="Visibility">
          <select className={fieldClass} value={input.visibility} onChange={(e) => set("visibility", e.target.value as Visibility)}>
            {VISIBILITIES.map((v) => (
              <option key={v.value} value={v.value}>
                {v.label}
              </option>
            ))}
          </select>
        </Field>

        {input.visibility === "department" && (
          <Field label="Departments" error={errors.departments} hint="Comma-separated — required for department visibility.">
            <input
              className={fieldClass}
              placeholder="aso, media"
              value={input.departments}
              onChange={(e) => set("departments", e.target.value)}
            />
          </Field>
        )}

        <Field label="Tags" hint={knownTags.length ? `In use: ${knownTags.slice(0, 8).join(", ")}` : "Comma-separated."}>
          <input
            className={fieldClass}
            placeholder="seo, marketing, audit"
            value={input.tags}
            onChange={(e) => set("tags", e.target.value)}
          />
        </Field>

        <Field label="Owner" error={errors.owner} hint="Email of the person who maintains this skill.">
          <input
            className={fieldClass}
            placeholder="you@moburst.com"
            value={input.owner}
            onChange={(e) => set("owner", e.target.value)}
          />
        </Field>
      </form>

      {/* Preview + actions */}
      <div className="space-y-4">
        <div className="overflow-hidden rounded-2xl border border-card-border bg-card/40 backdrop-blur-xl">
          <div className="flex items-center justify-between border-b border-card-border px-4 py-2.5">
            <span className="font-mono text-xs text-text-muted">
              skills/{input.name.trim() || "new-skill"}/SKILL.md
            </span>
            <span className={`text-xs font-medium ${isValid ? "text-positive" : "text-text-muted"}`}>
              {isValid ? "✓ valid" : `${Object.keys(errors).length} to fix`}
            </span>
          </div>
          <pre className="max-h-[460px] overflow-auto p-4 text-xs leading-relaxed text-text-secondary">
            <code>{markdown}</code>
          </pre>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={copy}
            className="inline-flex items-center gap-1.5 rounded-lg border border-card-border bg-card/40 px-3 py-2 text-sm font-medium text-text-secondary backdrop-blur-xl transition hover:border-accent/40 hover:text-text-primary"
          >
            {copied ? "Copied!" : "Copy SKILL.md"}
          </button>
          <button
            type="button"
            onClick={download}
            className="inline-flex items-center gap-1.5 rounded-lg border border-card-border bg-card/40 px-3 py-2 text-sm font-medium text-text-secondary backdrop-blur-xl transition hover:border-accent/40 hover:text-text-primary"
          >
            Download
          </button>
          <a
            href={!isValid || tooLongForPrefill ? undefined : githubUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-disabled={!isValid || tooLongForPrefill}
            onClick={(e) => {
              if (!isValid || tooLongForPrefill) e.preventDefault();
            }}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition ${
              isValid && !tooLongForPrefill
                ? "bg-accent/15 text-accent hover:bg-accent/25"
                : "cursor-not-allowed border border-card-border bg-card/40 text-text-muted/50"
            }`}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 .5C5.7.5.5 5.7.5 12c0 5.1 3.3 9.4 7.9 10.9.6.1.8-.2.8-.6v-2c-3.2.7-3.9-1.4-3.9-1.4-.5-1.3-1.3-1.7-1.3-1.7-1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1 1.8 2.8 1.3 3.5 1 .1-.8.4-1.3.7-1.6-2.6-.3-5.3-1.3-5.3-5.8 0-1.3.5-2.3 1.2-3.1-.1-.3-.5-1.5.1-3.1 0 0 1-.3 3.3 1.2a11.5 11.5 0 0 1 6 0C17.3 4.7 18.3 5 18.3 5c.6 1.6.2 2.8.1 3.1.8.8 1.2 1.8 1.2 3.1 0 4.5-2.7 5.5-5.3 5.8.4.4.8 1.1.8 2.2v3.3c0 .3.2.7.8.6 4.6-1.5 7.9-5.8 7.9-10.9C23.5 5.7 18.3.5 12 .5Z" />
            </svg>
            Open in GitHub editor
          </a>
        </div>

        {tooLongForPrefill && (
          <p className="text-xs text-negative">
            The generated file is too large to prefill via GitHub&apos;s URL — copy or download it,
            then paste into a new file in the repo.
          </p>
        )}
        <p className="text-xs text-text-muted">
          The repo is the source of truth. Opens GitHub&apos;s new-file editor with this content
          prefilled — commit it directly or open a PR. The portal runs the same schema validation;
          invalid skills aren&apos;t indexed.{" "}
          <Link href="/skills" className="text-text-secondary underline hover:text-text-primary">
            Back to catalog
          </Link>
        </p>
      </div>
    </div>
  );
}

function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  const labelId = useId();
  // Associate the label with whatever control it wraps (input / textarea / select,
  // or the Targets button-group div) via aria-labelledby — works uniformly where a
  // plain htmlFor can't, since some Fields wrap a non-labelable element.
  const control = isValidElement(children)
    ? cloneElement(children as ReactElement<{ "aria-labelledby"?: string }>, {
        "aria-labelledby": labelId,
      })
    : children;
  return (
    <div className="space-y-1.5">
      <label id={labelId} className={labelClass}>
        {label}
      </label>
      {control}
      {error ? (
        <p className="text-xs text-negative">{error}</p>
      ) : hint ? (
        <p className="text-xs text-text-muted/70">{hint}</p>
      ) : null}
    </div>
  );
}
