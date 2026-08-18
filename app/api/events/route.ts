// Portal action ingest (plan: plans/telemetry-usage-tracking.md, Layer 1 / Phase 3).
// The browser calls this on view / copy / download. Previously a console.log stub;
// it now persists through the same store as /api/telemetry, which is what makes the
// download→usage funnel computable (a download that never reaches the store leaves
// every skill looking un-downloaded, so nothing can ever be flagged dormant).
import { appendEvent } from "@/lib/telemetry-store";
import { buildEvent, rateLimited } from "@/lib/telemetry-ingest";

export const runtime = "nodejs";

export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return Response.json({ ok: false, error: "invalid body" }, { status: 400 });
  }

  const event = buildEvent(body, { source: "portal" });
  if (!event) {
    return Response.json({ ok: false, error: "slug and type required" }, { status: 400 });
  }

  // Portal events are browser-originated and carry no device_id; key the limit on
  // the forwarded IP so one tab cannot flood the store.
  if (rateLimited(req.headers.get("x-forwarded-for") ?? "portal")) {
    return Response.json({ ok: false, error: "rate limited" }, { status: 429 });
  }

  try {
    await appendEvent(event);
  } catch (err) {
    console.error("[events] persist failed", err);
    return Response.json({ ok: false, error: "persist failed" }, { status: 500 });
  }

  return Response.json({ ok: true, id: event.id });
}
