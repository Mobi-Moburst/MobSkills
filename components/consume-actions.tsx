"use client";

import { useEffect, useRef, useState } from "react";
import type { Runtime } from "@/lib/types";

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
  install,
  downloadable = true,
  sizeLabel,
  runtime = "local",
}: {
  slug: string;
  version: string | null;
  skillMarkdown: string;
  /** Install commands. Only the terminal audience ever sees a command. */
  install: {
    terminalMarketplace: string;
    terminalInstall: string;
    /** Shared: skill slash commands DO work in Desktop's prompt box. */
    invoke: string;
  };
  /** False when the skill exceeds the inline-zip cap — show install instead of a 413. */
  downloadable?: boolean;
  sizeLabel?: string;
  runtime?: Runtime;
}) {
  const [copied, setCopied] = useState<string | null>(null);
  // Desktop first: most people here have never opened a terminal, and a guide whose
  // first line is a shell command reads as "not for me".
  const [how, setHow] = useState<"desktop" | "terminal">("desktop");

  // Log one `view` per mount. The ref guard matters: React strict mode runs
  // effects twice in dev, which would double every view count.
  const viewLogged = useRef(false);
  useEffect(() => {
    if (viewLogged.current) return;
    viewLogged.current = true;
    logEvent(slug, "view", version);
  }, [slug, version]);

  async function copy(kind: string, text: string) {
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
      {runtime === "hosted" && (
        <div className="rounded-lg border border-[#4a9ef5]/25 bg-[#4a9ef5]/10 p-3 text-xs leading-relaxed text-text-secondary">
          <span className="font-semibold text-[#7cbcff]">Hosted skill.</span>{" "}
          Built for <strong>claude.ai / Claude Desktop</strong> — get the files below, then add it
          as a skill there. Running it in local Claude Code or Codex needs path changes (it uses
          <code className="mx-1 rounded bg-surface px-1">/mnt/skills</code>paths).
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {downloadable ? (
          <a
            href={`/api/skills/${slug}/download`}
            onClick={() => logEvent(slug, "download", version)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-background transition hover:bg-accent/90"
          >
            ↓ Download .zip
          </a>
        ) : (
          <span
            title={`Too large to zip inline${sizeLabel ? ` (${sizeLabel})` : ""}. Use the install steps below.`}
            className="inline-flex cursor-not-allowed items-center gap-1.5 rounded-lg border border-card-border bg-card px-3 py-2 text-sm font-medium text-text-muted"
          >
            ↓ Too large to download{sizeLabel ? ` (${sizeLabel})` : ""}
          </span>
        )}
        <button
          onClick={() => copy("skill", skillMarkdown)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-card-border bg-card px-3 py-2 text-sm font-medium text-text-secondary transition hover:border-accent/40 hover:text-text-primary"
        >
          {copied === "skill" ? "✓ Copied" : "Copy SKILL.md"}
        </button>
      </div>

      {!downloadable && (
        <p className="text-xs text-text-muted">
          Over the in-portal download limit — use the install steps below to fetch it from GitHub.
        </p>
      )}

      <div className="rounded-lg border border-card-border bg-surface p-3">
        {/* Two audiences, not one flow with caveats. Most users cannot open a terminal;
            terminal users do not want click-path instructions. */}
        <div className="mb-3 flex gap-1 rounded-lg bg-background/60 p-1">
          {(
            [
              ["desktop", "Claude Desktop"],
              ["terminal", "Terminal"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              onClick={() => setHow(id)}
              aria-pressed={how === id}
              className={`flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition ${
                how === id
                  ? "bg-card text-text-primary shadow-sm"
                  : "text-text-muted hover:text-text-secondary"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {how === "desktop" ? (
          /* No commands in this path on purpose. `/plugin` is terminal-only — Desktop
             answers "/plugin is only available in the Claude Code terminal". The menu
             item is "Browse plugins", not "Add plugin". Skill commands like
             /mobskills:<slug> DO work in the prompt box (verified). */
          <>
            <Step n={1} label="Open the Code tab">
              <p className="text-xs leading-relaxed text-text-secondary">
                In Claude Desktop, click <strong className="text-text-primary">Code</strong> and
                start or open a session.
              </p>
            </Step>
            <Step n={2} label="Open the plugin browser">
              <p className="text-xs leading-relaxed text-text-secondary">
                Next to the prompt box click <strong className="text-text-primary">+</strong> &rarr;{" "}
                <strong className="text-text-primary">Plugins</strong> &rarr;{" "}
                <strong className="text-text-primary">Browse plugins</strong>.
              </p>
            </Step>
            <Step n={3} label="Install MobSkills">
              <p className="text-xs leading-relaxed text-text-secondary">
                Pick <strong className="text-text-primary">MobSkills</strong> from the list and
                install it. That adds every skill at once.
              </p>
              <p className="mt-2 rounded-md border border-accent/25 bg-accent/[0.07] p-2 text-xs leading-relaxed text-text-secondary">
                <strong className="text-accent">Not in the list?</strong> The library isn&apos;t
                registered on your machine yet, and Desktop can&apos;t register it. Ask IT to add it
                for everyone, or use the Terminal tab once.
              </p>
            </Step>
            <Step n={4} label="Use it" hint="type it in the prompt box" last>
              <code className="block break-words font-mono text-xs text-accent">{install.invoke}</code>
            </Step>
          </>
        ) : (
          <>
            <Step n={1} label="Add the library" hint="one time">
              <CommandLine
                text={install.terminalMarketplace}
                copied={copied === "tm"}
                onCopy={() => copy("tm", install.terminalMarketplace)}
              />
            </Step>
            <Step n={2} label="Install it">
              <CommandLine
                text={install.terminalInstall}
                copied={copied === "ti"}
                onCopy={() => copy("ti", install.terminalInstall)}
              />
            </Step>
            <Step n={3} label="Use it" hint="inside claude" last>
              <code className="block break-words font-mono text-xs text-accent">{install.invoke}</code>
            </Step>
          </>
        )}

        <p className="mt-3 border-t border-card-border pt-3 text-xs leading-relaxed text-text-muted">
          Installing gets you every MobSkills skill, not just this one. If Claude says
          &ldquo;Run /reload-plugins&rdquo;, do that first.
        </p>
      </div>
    </div>
  );
}

/** One numbered step in the install flow. */
function Step({
  n,
  label,
  hint,
  last = false,
  children,
}: {
  n: number;
  label: string;
  hint?: string;
  last?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={last ? "" : "mb-3 border-b border-card-border pb-3"}>
      <div className="mb-1.5 flex items-baseline gap-2">
        <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-accent/15 text-[10px] font-semibold text-accent">
          {n}
        </span>
        <span className="text-xs font-semibold text-text-primary">{label}</span>
        {hint && <span className="text-[11px] text-text-muted">{hint}</span>}
      </div>
      <div className="pl-6">{children}</div>
    </div>
  );
}

/**
 * A copyable one-line command. Wraps rather than scrolls: the themed 6px scrollbar
 * makes horizontal overflow invisible, and a command you cannot read in full is a
 * command you cannot trust.
 */
function CommandLine({
  text,
  copied,
  onCopy,
}: {
  text: string;
  copied: boolean;
  onCopy: () => void;
}) {
  return (
    <div className="flex items-start gap-2">
      <code className="min-w-0 flex-1 break-words font-mono text-xs leading-relaxed text-text-secondary">
        {text}
      </code>
      <button
        onClick={onCopy}
        className="shrink-0 text-xs font-medium text-accent transition hover:underline"
      >
        {copied ? "✓" : "Copy"}
      </button>
    </div>
  );
}
