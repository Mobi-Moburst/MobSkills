import JSZip from "jszip";
import { getSkill, readSkillFiles } from "@/lib/skills";

// Runs as a Node function (reads files + builds the zip on request).
export const runtime = "nodejs";

// Keep the in-memory zip well under Vercel's 4.5 MB response limit.
const MAX_BYTES = 4 * 1024 * 1024;

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const skill = getSkill(slug);
  if (!skill) {
    return new Response("Skill not found", { status: 404 });
  }

  const files = readSkillFiles(slug);
  const total = files.reduce((n, f) => n + f.content.byteLength, 0);
  if (total > MAX_BYTES) {
    return new Response("Skill too large to zip inline", { status: 413 });
  }

  const zip = new JSZip();
  const root = zip.folder(slug)!;
  for (const f of files) root.file(f.path, f.content);
  const buf = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });

  return new Response(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${slug}.zip"`,
      "Cache-Control": "public, max-age=300",
    },
  });
}
