"use client";

import { useState } from "react";

function logEvent(slug: string, type: string, version: string | null) {
  // Fire-and-forget. In Phase 2 this lands in Postgres; for now /api/events logs it.
  fetch("/api/events", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ slug, type, version, source: "portal" }),
    keepalive: true,
  }).catch(() => {});
}

export function ConsumeActions({
  slug,
  version,
  skillMarkdown,
  installSnippet,
}: {
  slug: string;
  version: string | null;
  skillMarkdown: string;
  installSnippet: string;
}) {
  const [copied, setCopied] = useState<null | "skill" | "install">(null);

  async function copy(kind: "skill" | "install", text: string) {
    try {
      await navigator.clipboard.writeText(text);
      logEvent(slug, "copy", version);
      setCopied(kind);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      // Clipboard unavailable (insecure context / denied) — fail quietly.
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        <a
          href={`/api/skills/${slug}/download`}
          onClick={() => logEvent(slug, "download", version)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-background transition hover:bg-accent/90"
        >
          ↓ Download .zip
        </a>
        <button
          onClick={() => copy("skill", skillMarkdown)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-card-border bg-card px-3 py-2 text-sm font-medium text-text-secondary transition hover:border-accent/40 hover:text-text-primary"
        >
          {copied === "skill" ? "✓ Copied" : "Copy SKILL.md"}
        </button>
      </div>

      <div className="rounded-lg border border-card-border bg-surface p-3">
        <div className="mb-1.5 flex items-center justify-between">
          <span className="text-xs font-medium uppercase tracking-wider text-text-muted">Install</span>
          <button
            onClick={() => copy("install", installSnippet)}
            className="text-xs font-medium text-accent hover:underline"
          >
            {copied === "install" ? "✓ Copied" : "Copy"}
          </button>
        </div>
        <pre className="overflow-x-auto text-xs text-text-secondary">
          <code>{installSnippet}</code>
        </pre>
      </div>
    </div>
  );
}
