// Runtime usage ingest (plan: plans/telemetry-usage-tracking.md, Layer 2 / Phase 1).
// Receives the deterministic "skill was used" POST from the plugin hook running in
// Claude Desktop / CLI. Validation and the metadata-only privacy allowlist live in
// lib/telemetry-ingest so this route and /api/events cannot drift apart.
//
// Storage is a swappable local JSONL store today; swap lib/telemetry-store for a
// Supabase insert in Phase 2 without touching this route.
import { appendEvent } from "@/lib/telemetry-store";
import { buildEvent, rateLimited } from "@/lib/telemetry-ingest";
import { summarize } from "@/lib/telemetry-report";

export const runtime = "nodejs";

export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return Response.json({ ok: false, error: "invalid body" }, { status: 400 });
  }

  const event = buildEvent(body, { source: "runtime" });
  if (!event) {
    return Response.json({ ok: false, error: "slug and valid type required" }, { status: 400 });
  }

  const rateKey = event.device_id ?? req.headers.get("x-forwarded-for") ?? "anon";
  if (rateLimited(rateKey)) {
    return Response.json({ ok: false, error: "rate limited" }, { status: 429 });
  }

  try {
    await appendEvent(event);
  } catch (err) {
    console.error("[telemetry] persist failed", err);
    return Response.json({ ok: false, error: "persist failed" }, { status: 500 });
  }

  return Response.json({ ok: true, id: event.id });
}

// Verification helper (plan §11): the same aggregation the /analytics page renders,
// as JSON — handy for curl during the Phase 0 spike.
export async function GET() {
  const summary = await summarize();
  return Response.json(summary);
}
