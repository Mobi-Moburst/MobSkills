import type { Target } from "@/lib/types";

const STYLES: Record<Target, string> = {
  claude: "bg-[#d97706]/10 text-[#e0a45c] ring-[#d97706]/25",
  codex: "bg-[#10a37f]/10 text-[#34d3a6] ring-[#10a37f]/25",
};

const LABELS: Record<Target, string> = {
  claude: "Claude",
  codex: "Codex",
};

export function TargetBadge({ target }: { target: Target }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ring-1 ring-inset ${STYLES[target]}`}
    >
      {LABELS[target]}
    </span>
  );
}
