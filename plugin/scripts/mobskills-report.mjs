#!/usr/bin/env node
// MobSkills telemetry reporter (plan: plans/telemetry-usage-tracking.md, Layer 2).
//
// Runs as a Claude Code *command hook* bundled in the MobSkills plugin. Its only
// job: POST a metadata-only "this skill was used" event to /api/telemetry.
//
// Non-negotiables (plan §7):
//   - Metadata ONLY. We never read or forward prompt text, file contents, tool
//     args, or cwd/transcript paths. The fields below are the entire payload.
//   - Never break the user's session. Every failure path exits 0, and the POST
//     is time-boxed, so a portal that is down or slow costs nothing.
//   - MOBSKILLS_TELEMETRY=0 disables emission entirely.
//
// Usage (from hooks/hooks.json or a SKILL.md `hooks:` block):
//   node mobskills-report.mjs --slug <skill> [--type usage] [--trigger slash|auto]
//                             [--dedupe session]
import { appendFile, mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import os from "node:os";
import path from "node:path";

const DEFAULT_ENDPOINT = "http://localhost:3000/api/telemetry";
const POST_TIMEOUT_MS = 3000;
const STDIN_TIMEOUT_MS = 1000;
const SESSION_MARKER_TTL_MS = 7 * 24 * 60 * 60 * 1000;

// ---------------------------------------------------------------- args & env

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (!a.startsWith("--")) continue;
    const key = a.slice(2);
    const next = argv[i + 1];
    if (next && !next.startsWith("--")) {
      out[key] = next;
      i += 1;
    } else {
      out[key] = "true";
    }
  }
  return out;
}

const args = parseArgs(process.argv.slice(2));

/**
 * Config resolution, widest-reach last. Claude Desktop launches from the GUI
 * with no shell, so environment variables cannot reach a hook there at all —
 * the config file is the only way to point a Desktop install at a portal that
 * is not on the default port. Env still wins for CLI use and CI.
 *
 * ~/.config/mobskills/config.json  →  { "endpoint": "...", "enabled": false }
 */
function readConfigSync() {
  try {
    const raw = readFileSync(path.join(os.homedir(), ".config", "mobskills", "config.json"), "utf8");
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {}; // absent or malformed config is not an error
  }
}

const config = readConfigSync();
const endpoint =
  process.env.MOBSKILLS_TELEMETRY_URL ||
  (typeof config.endpoint === "string" ? config.endpoint : "") ||
  DEFAULT_ENDPOINT;
const debug = process.env.MOBSKILLS_TELEMETRY_DEBUG === "1" || config.debug === true;

// Two different directories on purpose.
//
// dataDir  — per-install scratch (session markers, debug dumps). CLAUDE_PLUGIN_DATA
//            is set by Claude Code and differs per install context.
// identityDir — ONE fixed location for the anonymous device id, deliberately NOT
//            the plugin data dir. Keying identity off CLAUDE_PLUGIN_DATA makes one
//            person mint a fresh id per install path (observed live: a single
//            machine reported as 2 devices across `mobskills-inline` and the
//            fallback), which inflates the unique-user count that Level 2 rests on.
const dataDir =
  process.env.CLAUDE_PLUGIN_DATA || path.join(os.homedir(), ".config", "mobskills");
const identityDir = path.join(os.homedir(), ".config", "mobskills");

function log(...parts) {
  if (debug) console.error("[mobskills-report]", ...parts);
}

// ------------------------------------------------------------------- helpers

/** Read the hook's JSON payload from stdin, time-boxed so we can never hang. */
async function readStdinJson() {
  if (process.stdin.isTTY) return null;
  const collect = (async () => {
    const chunks = [];
    for await (const chunk of process.stdin) chunks.push(chunk);
    const raw = Buffer.concat(chunks).toString("utf8").trim();
    return raw ? JSON.parse(raw) : null;
  })();
  const timeout = new Promise((resolve) => setTimeout(() => resolve(null), STDIN_TIMEOUT_MS));
  try {
    return await Promise.race([collect, timeout]);
  } catch {
    return null; // unparseable stdin is not worth failing over
  }
}

/** Anonymous stable device id (plan §5, Level 2). Created once, reused forever. */
async function deviceId() {
  const file = path.join(identityDir, "device-id");
  try {
    const existing = (await readFile(file, "utf8")).trim();
    if (existing) return existing;
  } catch {
    // not created yet
  }
  const id = randomUUID();
  try {
    await mkdir(identityDir, { recursive: true });
    await writeFile(file, `${id}\n`, "utf8");
  } catch (err) {
    log("could not persist device id", err?.message);
  }
  return id;
}

/** Read `version:` out of the bundled SKILL.md so events carry the real version. */
async function skillVersion(slug) {
  const root = process.env.CLAUDE_PLUGIN_ROOT;
  if (!root || !slug) return null;
  try {
    const md = await readFile(path.join(root, "skills", slug, "SKILL.md"), "utf8");
    const frontmatter = md.split(/^---\s*$/m)[1] ?? "";
    return frontmatter.match(/^version:\s*["']?(\d+\.\d+\.\d+)["']?\s*$/m)?.[1] ?? null;
  } catch {
    return null;
  }
}

/**
 * One-event-per-(session, skill) guard. Used by SKILL.md `hooks:` blocks, which
 * stay registered for the rest of the session and would otherwise emit on every
 * tool call. Explicit `/slash` invocations skip this and count every run.
 */
async function alreadyReported(sessionId, slug, type) {
  if (!sessionId) return false;
  const dir = path.join(dataDir, "sessions");
  const safe = `${sessionId}-${slug}-${type}`.replace(/[^a-zA-Z0-9._-]/g, "_");
  const marker = path.join(dir, safe);
  try {
    await stat(marker);
    return true;
  } catch {
    // fall through and claim it
  }
  try {
    await mkdir(dir, { recursive: true });
    await writeFile(marker, "", "utf8");
    void pruneMarkers(dir);
  } catch (err) {
    log("could not write session marker", err?.message);
  }
  return false;
}

async function pruneMarkers(dir) {
  try {
    const cutoff = Date.now() - SESSION_MARKER_TTL_MS;
    for (const name of await readdir(dir)) {
      const p = path.join(dir, name);
      const s = await stat(p);
      if (s.mtimeMs < cutoff) await import("node:fs/promises").then((fs) => fs.rm(p, { force: true }));
    }
  } catch {
    // pruning is best-effort housekeeping
  }
}

/**
 * Local-only debug dump for the Phase 0 spike. Writes the RAW hook payload to
 * disk so we can discover the real field names (the docs do not spell out
 * UserPromptExpansion's event-level fields). This file never leaves the machine
 * and is never sent to the portal; only CLAUDE_* variable NAMES are recorded,
 * never their values, so nothing secret lands in it.
 */
async function writeDebugDump(payload, sent) {
  try {
    await mkdir(dataDir, { recursive: true });
    await appendFile(
      path.join(dataDir, "hook-debug.jsonl"),
      `${JSON.stringify({
        at: new Date().toISOString(),
        argv: process.argv.slice(2),
        claude_env_names: Object.keys(process.env).filter((k) => k.startsWith("CLAUDE_")).sort(),
        claude_code_entrypoint: process.env.CLAUDE_CODE_ENTRYPOINT ?? null,
        endpoint,
        raw_hook_payload: payload,
        sent,
      })}\n`,
      "utf8",
    );
  } catch (err) {
    log("debug dump failed", err?.message);
  }
}

// ---------------------------------------------------------------------- main

async function main() {
  const slug = args.slug;
  if (!slug) {
    log("no --slug given; nothing to report");
    return;
  }

  const payload = await readStdinJson();

  if (process.env.MOBSKILLS_TELEMETRY === "0" || config.enabled === false) {
    log("opted out (MOBSKILLS_TELEMETRY=0 or config enabled:false)");
    if (debug) await writeDebugDump(payload, null);
    return;
  }

  const sessionId = typeof payload?.session_id === "string" ? payload.session_id : null;
  if (args.dedupe === "session" && (await alreadyReported(sessionId, slug, args.type ?? "usage"))) {
    log("already reported for this session; skipping");
    return;
  }

  // Surface detection. Claude Code sets CLAUDE_CODE_ENTRYPOINT in the hook's
  // environment ("cli" in a terminal session). We map what we recognise and pass
  // the raw value through as metadata.session_kind, so the first Desktop run
  // tells us Desktop's value in the portal without needing the local debug file.
  const entrypoint = process.env.CLAUDE_CODE_ENTRYPOINT ?? "";
  const surface =
    (["desktop", "cli"].includes(process.env.MOBSKILLS_SURFACE ?? "") && process.env.MOBSKILLS_SURFACE) ||
    (["desktop", "cli"].includes(config.surface ?? "") && config.surface) ||
    (/desktop|electron|app/i.test(entrypoint) ? "desktop" : null) ||
    (/^cli$|\bcli\b|sse|mcp/i.test(entrypoint) ? "cli" : null);

  // This object is the ENTIRE wire payload. Nothing else is collected.
  const body = {
    type: args.type ?? "usage",
    source: "runtime",
    slug,
    version: await skillVersion(slug),
    surface,
    outcome: "ok",
    agent: "claude",
    device_id: await deviceId(),
    metadata: {
      event: typeof payload?.hook_event_name === "string" ? payload.hook_event_name : "unknown",
      trigger: args.trigger ?? "slash",
      // Raw entrypoint enum (e.g. "cli"). Not sensitive — it identifies the
      // client, never the user or their work — and it is how we learn what
      // Desktop reports so surface detection above can be completed.
      session_kind: entrypoint || "unset",
    },
  };

  let sent = null;
  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(POST_TIMEOUT_MS),
    });
    sent = { status: res.status, ok: res.ok, body };
    log(`POST ${endpoint} -> ${res.status}`);
  } catch (err) {
    sent = { error: err?.message ?? "fetch failed", body };
    log("POST failed", err?.message); // portal down is not the user's problem
  }

  if (debug) await writeDebugDump(payload, sent);
}

// A telemetry hook must never fail the turn it is observing.
main()
  .catch((err) => log("unexpected error", err?.message))
  .finally(() => process.exit(0));
