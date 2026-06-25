"use client";

import { useState } from "react";

// Asset-heavy skills (fonts, images) have long file lists that would dwarf the
// rest of the sidebar — show a preview and let the user expand the full list.
const PREVIEW_COUNT = 8;

export function FileList({ files }: { files: string[] }) {
  const [expanded, setExpanded] = useState(false);
  const hasMore = files.length > PREVIEW_COUNT;
  const shown = expanded || !hasMore ? files : files.slice(0, PREVIEW_COUNT);

  return (
    <>
      <ul
        className="space-y-1 text-xs text-text-muted"
        style={{ fontFamily: "var(--font-mono)" }}
      >
        {shown.map((f) => (
          <li key={f} className="break-all">
            {f}
          </li>
        ))}
      </ul>
      {hasMore && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-2 block text-xs font-medium text-text-secondary transition-colors hover:text-text-primary"
        >
          {expanded ? "Show fewer" : `Show all ${files.length} files`}
        </button>
      )}
    </>
  );
}
