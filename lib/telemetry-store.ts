import "server-only";
import { randomUUID } from "node:crypto";
import { appendFile, mkdir, readFile } from "node:fs/promises";
import path from "node:path";

// Throwaway local store for the telemetry spike / Phase 1.
// Persists events to a gitignored JSONL file so the full Section-11 path is
// runnable locally NOW, before the MobSkills Supabase project exists.
//
// To go to Phase 2: replace the body of `appendEvent`/`readEvents` with a
// Supabase insert/select against the `events` table (schema in
// plans/telemetry-usage-tracking.md §8). Callers do not change.

const DATA_DIR = path.join(process.cwd(), ".data");
const EVENTS_FILE = path.join(DATA_DIR, "events.jsonl");

// Mirrors the `events` fact table (plan §8). Metadata-only, no sensitive content.
export type TelemetryEvent = {
  id: string;
  created_at: string;
  type: "view" | "copy" | "download" | "install" | "usage" | "feedback";
  source: "portal" | "runtime";
  slug: string; // skill slug (skill_id dimension via lib/skills.ts)
  version: string | null;
  surface: "desktop" | "cli" | null;
  outcome: "ok" | "error" | null;
  agent: "claude" | "codex" | null;
  device_id: string | null; // anonymous stable id (Level 2)
  user_id: string | null; // filled once identity lands (Level 3/4)
  metadata: Record<string, string | number | boolean> | null;
};

export async function appendEvent(e: TelemetryEvent): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
  await appendFile(EVENTS_FILE, JSON.stringify(e) + "\n", "utf8");
}

export async function readEvents(): Promise<TelemetryEvent[]> {
  try {
    const raw = await readFile(EVENTS_FILE, "utf8");
    return raw
      .split("\n")
      .filter(Boolean)
      .map((line) => JSON.parse(line) as TelemetryEvent);
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw err;
  }
}

export function newEvent(): { id: string; created_at: string } {
  return { id: randomUUID(), created_at: new Date().toISOString() };
}
