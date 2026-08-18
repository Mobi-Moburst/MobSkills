// Table-of-contents + heading-slug helpers — pure, framework-free (no "server-only").
//
// The SINGLE source of slug truth: the markdown heading renderer (components/markdown.tsx)
// and the TOC (components/table-of-contents.tsx) both slugify through here, so a TOC link
// and its target heading id can never drift apart.

export interface Heading {
  depth: 2 | 3;
  text: string;
  slug: string;
}

/** GitHub-ish slug: lowercase, drop anything but word chars / space / hyphen, spaces→hyphens. */
export function slugify(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Strip inline markdown markers so the extracted text matches the RENDERED heading text.
// Covers code/bold/italic/links; does NOT decode HTML entities or strip images — a heading
// with those would slug-drift from the renderer. Our skill headings are plain text.
function stripInline(text: string): string {
  return text
    .replace(/`([^`]+)`/g, "$1") // `code`
    .replace(/\*\*([^*]+)\*\*/g, "$1") // **bold**
    .replace(/\*([^*]+)\*/g, "$1") // *italic*
    .replace(/_([^_]+)_/g, "$1") // _italic_
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1") // [text](url)
    .trim();
}

/**
 * Extract h2/h3 headings from raw markdown for the TOC. Skips fenced code blocks (so a `#`
 * comment inside ``` ``` isn't mistaken for a heading) and the single h1 title.
 */
export function extractHeadings(markdown: string): Heading[] {
  const headings: Heading[] = [];
  let inFence = false;

  for (const line of markdown.split("\n")) {
    if (/^\s*(```|~~~)/.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;

    const m = /^(#{2,3})\s+(.+?)\s*#*\s*$/.exec(line);
    if (!m) continue;

    const text = stripInline(m[2]);
    if (!text) continue;
    headings.push({ depth: m[1].length as 2 | 3, text, slug: slugify(text) });
  }

  return headings;
}
