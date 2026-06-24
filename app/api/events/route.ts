// Phase 1 stub: log consume events. Phase 2 persists these to Postgres
// (events table) and attaches the authenticated user_id.
export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { slug, type, version, source } = body ?? {};
    if (!slug || !type) {
      return Response.json({ ok: false, error: "slug and type required" }, { status: 400 });
    }
    console.log("[event]", JSON.stringify({ slug, type, version: version ?? null, source: source ?? "portal" }));
    return Response.json({ ok: true });
  } catch (err) {
    console.error("[event] failed to handle body", err);
    return Response.json({ ok: false, error: "invalid body" }, { status: 400 });
  }
}
