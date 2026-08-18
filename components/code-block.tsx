"use client";

import { useRef, useState, type ComponentPropsWithoutRef } from "react";

/**
 * `pre` renderer override for react-markdown — wraps the code block with a hover/focus
 * copy button. Reads the code via the <pre>'s textContent (robust to rehype-highlight's
 * inner <span> markup, and to whatever child shape react-markdown passes).
 */
export function CodeBlock({
  children,
  node,
  ...rest
}: ComponentPropsWithoutRef<"pre"> & { node?: unknown }) {
  // react-markdown passes a hast `node`; destructured out above so it doesn't hit the DOM <pre>.
  void node;
  const preRef = useRef<HTMLPreElement>(null);
  const [copied, setCopied] = useState(false);

  async function copy() {
    const text = preRef.current?.textContent ?? "";
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard blocked (denied permission / insecure context) — leave the label as is.
    }
  }

  return (
    <div className="group/code relative">
      <button
        type="button"
        onClick={copy}
        aria-label={copied ? "Copied" : "Copy code"}
        className="absolute right-2 top-2 z-10 inline-flex items-center gap-1 rounded-md border border-card-border bg-card/80 px-2 py-1 text-xs font-medium text-text-muted opacity-0 backdrop-blur-xl transition hover:border-accent/40 hover:text-text-primary focus-visible:opacity-100 group-hover/code:opacity-100"
      >
        {copied ? (
          <>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6 9 17l-5-5" />
            </svg>
            Copied
          </>
        ) : (
          <>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
            Copy
          </>
        )}
      </button>
      <pre ref={preRef} {...rest}>
        {children}
      </pre>
    </div>
  );
}
