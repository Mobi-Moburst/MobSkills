import "server-only";
import { newEvent, type TelemetryEvent } from "@/lib/telemetry-store";

// Shared validation + privacy guardrail for BOTH ingest routes:
//   /api/telemetry — runtime usage, POSTed by the plugin hook (plan Layer 2)
//   /api/events    — portal actions: view / copy / download (plan Layer 1)
// It lives here so the metadata allowlist below exists exactly once. Two copies
// of a privacy control drift, and the drift is always in the unsafe direction.

export const TYPES = ["view", "copy", "download", "install", "usage", "feedback"] as const;
export const SOURCES = ["portal", "runtime"] as const;
export const SURFACES = ["desktop", "cli"] as const;
export const OUTCOMES = ["ok", "error"] as const;
export const AGENTS = ["claude", "codex"] as const;

export function pick<T extends readonly string[]>(v: unknown, allowed: T): T[number] | null {
  return typeof v === "string" && (allowed as readonly string[]).includes(v) ? (v as T[number]) : null;
}

// Privacy guardrail (plan §7, non-negotiable): metadata is a strict KEY allowlist,
// not free-form. Even if a misconfigured hook sends prompt_text / cwd / file
// contents / args, only these known-safe keys are stored — everything else is
// dropped, along with any nested object/array. Extend this list deliberately;
// never add a key that could carry prompt text, paths, or client data.
const METADATA_KEYS = new Set([
  "event", // which hook event fired (e.g. UserPromptExpansion)
  "trigger", // slash vs auto-invoke
  "note", // short spike/debug marker
  "feedback", // thumbs up/down value
  "reason", // short enum-like reason for an outcome
  "error_code", // non-sensitive error classifier
  "session_kind", // local | ssh | etc.
]);

export function sanitizeMetadata(input: unknown): TelemetryEvent["metadata"] {
  if (!input || typeof input !== "object" || Array.isArray(input)) return null;
  const out: Record<string, string | number | boolean> = {};
  for (const [k, val] of Object.entries(input as Record<string, unknown>)) {
    if (!METADATA_KEYS.has(k)) continue; // unknown key -> dropped (could be sensitive)
    if (typeof val === "string") out[k] = val.slice(0, 200);
    else if (typeof val === "number" || typeof val === "boolean") out[k] = val;
    // objects/arrays/null dropped — could smuggle content
  }
  return Object.keys(out).length ? out : null;
}

/**
 * Validate an untrusted ingest body into a storable event.
 * Returns null when the caller sent no usable `slug` + `type`.
 */
export function buildEvent(
  body: Record<string, unknown>,
  defaults: { source: TelemetryEvent["source"] },
): TelemetryEvent | null {
  const type = pick(body.type, TYPES);
  const slug = typeof body.slug === "string" ? body.slug.slice(0, 128) : null;
  if (!type || !slug) return null;

  return {
    ...newEvent(),
    type,
    source: pick(body.source, SOURCES) ?? defaults.source,
    slug,
    version: typeof body.version === "string" ? body.version : null,
    surface: pick(body.surface, SURFACES),
    outcome: pick(body.outcome, OUTCOMES),
    agent: pick(body.agent, AGENTS),
    device_id: typeof body.device_id === "string" ? body.device_id.slice(0, 128) : null,
    user_id: null, // Level 3/4 identity fills this later
    metadata: sanitizeMetadata(body.metadata),
  };
}

// Best-effort in-memory rate limit (fixed window, keyed per caller). Serverless
// resets this per instance — it throttles floods, it is not a security control.
const RATE_MAX = 60;
const RATE_WINDOW_MS = 60_000;
const hits = new Map<string, { count: number; resetAt: number }>();

export function rateLimited(key: string): boolean {
  const now = Date.now();
  const rec = hits.get(key);
  if (!rec || now > rec.resetAt) {
    hits.set(key, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return false;
  }
  rec.count += 1;
  return rec.count > RATE_MAX;
}
