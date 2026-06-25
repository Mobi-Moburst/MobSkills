"use client";

import { useLayoutEffect, useRef, useState } from "react";

// Fallback collapsed height (mobile / when no sidebar to align to).
const FALLBACK_MAX_PX = 520;
// Never collapse below this, even if the sidebar is very short. Kept low so a
// lean sidebar (few details, one file) still bottom-aligns instead of the body
// overshooting past it; only pathologically short sidebars hit this floor.
const MIN_COLLAPSED_PX = 240;
// Space below the clip occupied by the toggle button + card bottom padding,
// so the card's outer bottom lands level with the sidebar's bottom.
const BELOW_CLIP_PX = 96;

export function ExpandableBody({ children }: { children: React.ReactNode }) {
  const clipRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState(false);
  // Assume it overflows on first paint so long bodies render clipped (no flash
  // of full height). Corrected on mount once we can measure.
  const [overflows, setOverflows] = useState(true);
  const [maxH, setMaxH] = useState(FALLBACK_MAX_PX);

  useLayoutEffect(() => {
    const clip = clipRef.current;
    const inner = innerRef.current;
    if (!clip || !inner) return;

    const grid = clip.closest("[data-detail-grid]");
    const aside = (grid?.querySelector("aside") ?? null) as HTMLElement | null;

    const measure = () => {
      let target = FALLBACK_MAX_PX;
      // Only align side-by-side; on stacked layouts the sidebar sits below.
      const sideBySide = aside && window.innerWidth >= 1024;
      if (sideBySide) {
        const clipTop = clip.getBoundingClientRect().top;
        const asideBottom = aside!.getBoundingClientRect().bottom;
        target = Math.max(MIN_COLLAPSED_PX, asideBottom - clipTop - BELOW_CLIP_PX);
      }
      setMaxH(target);
      setOverflows(inner.scrollHeight > target + 24);
    };

    measure();
    // Web fonts change both column heights after first paint — re-measure once
    // they settle, plus a frame later, so the alignment uses final metrics.
    const raf = requestAnimationFrame(measure);
    void document.fonts?.ready.then(measure);

    const ro = new ResizeObserver(measure);
    ro.observe(inner);
    if (aside) ro.observe(aside);
    window.addEventListener("resize", measure);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  const collapsed = overflows && !expanded;

  return (
    <div>
      <div
        ref={clipRef}
        className="relative overflow-hidden transition-[max-height] duration-300 ease-out"
        style={{ maxHeight: collapsed ? maxH : undefined }}
      >
        <div ref={innerRef}>{children}</div>
        {collapsed && (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 bottom-0 h-28"
            style={{ background: "linear-gradient(to top, var(--color-card), transparent)" }}
          />
        )}
      </div>

      {overflows && (
        <div className="mt-4 flex justify-center border-t border-card-border/60 pt-4">
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-card-border bg-card/40 px-3.5 py-1.5 text-sm font-medium text-text-secondary backdrop-blur-xl transition hover:border-accent/40 hover:text-text-primary"
          >
            {expanded ? "Show less" : "Show full skill"}
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={`transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
            >
              <path d="m6 9 6 6 6-6" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}
