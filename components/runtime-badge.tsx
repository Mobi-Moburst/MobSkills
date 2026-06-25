import type { Runtime } from "@/lib/types";

const STYLES: Record<Runtime, string> = {
  hosted: "bg-[#4a9ef5]/10 text-[#7cbcff] ring-[#4a9ef5]/25",
  local: "bg-text-muted/10 text-text-secondary ring-card-border",
};

const LABELS: Record<Runtime, string> = {
  hosted: "🌐 Hosted",
  local: "💻 Local",
};

/** Where the skill runs — hosted (claude.ai / Desktop sandbox) vs local (Claude Code CLI, Codex). */
export function RuntimeBadge({ runtime }: { runtime: Runtime }) {
  return (
    <span
      title={
        runtime === "hosted"
          ? "Runs in Anthropic's cloud sandbox (claude.ai / Claude Desktop). Uses /mnt/skills paths."
          : "Runs anywhere — local Claude Code CLI or Codex."
      }
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ring-1 ring-inset ${STYLES[runtime]}`}
    >
      {LABELS[runtime]}
    </span>
  );
}
