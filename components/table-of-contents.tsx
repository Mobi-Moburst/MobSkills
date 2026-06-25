import type { Heading } from "@/lib/toc";

/**
 * "On this page" sidebar card — plain anchor links to in-body headings. No client JS:
 * ExpandableBody's hash listener handles auto-expanding + scrolling when a link is clicked.
 */
export function TableOfContents({ headings }: { headings: Heading[] }) {
  return (
    <section className="rounded-2xl border border-card-border bg-card/80 p-4 text-sm backdrop-blur-xl">
      <h2 className="mb-3 text-sm font-semibold text-text-primary">On this page</h2>
      <nav>
        <ul className="space-y-1.5">
          {headings.map((h, i) => (
            <li key={`${h.slug}-${i}`} className={h.depth === 3 ? "pl-3" : undefined}>
              <a
                href={`#${h.slug}`}
                className="block truncate text-text-muted transition-colors hover:text-text-primary"
              >
                {h.text}
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </section>
  );
}
