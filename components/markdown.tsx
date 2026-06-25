import { isValidElement, type ReactNode } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import "highlight.js/styles/github-dark.css";
import { slugify } from "@/lib/toc";
import { CodeBlock } from "./code-block";

/** Flatten react-markdown's heading children to plain text for slug generation. */
function toText(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(toText).join("");
  if (isValidElement(node)) return toText((node.props as { children?: ReactNode }).children);
  return "";
}

function heading(Tag: "h2" | "h3" | "h4") {
  function Heading({ children }: { children?: ReactNode }) {
    const slug = slugify(toText(children));
    return (
      <Tag id={slug} className="group/h scroll-mt-24">
        {children}
        {slug && (
          <a
            href={`#${slug}`}
            aria-label="Link to this section"
            className="ml-2 text-accent opacity-0 transition-opacity group-hover/h:opacity-100"
          >
            #
          </a>
        )}
      </Tag>
    );
  }
  Heading.displayName = `Heading-${Tag}`;
  return Heading;
}

// h2–h4 all get anchor ids; the TOC (lib/toc.ts extractHeadings) intentionally lists
// only h2/h3, so h4 is deep-linkable but not enumerated in the sidebar nav.
const components: Components = {
  pre: CodeBlock,
  h2: heading("h2"),
  h3: heading("h3"),
  h4: heading("h4"),
};

export function Markdown({ children }: { children: string }) {
  return (
    <div className="md">
      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]} components={components}>
        {children}
      </ReactMarkdown>
    </div>
  );
}
