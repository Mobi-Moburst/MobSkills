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
//   - MOBSKILLS_TELEMETRY_IDENTIFY=0 omits the reporter's email.
//
// Usage — only hooks/hooks.json invokes this; there are exactly two call sites:
//   PostToolUse/Skill: node mobskills-report.mjs --trigger skill-tool
//                      (slug is read from the payload)
//   SessionStart:      node mobskills-report.mjs --type install --slug mobskills
//                      --trigger session-start
//
// Per-invocation deduping used to live here for SKILL.md `hooks:` blocks that
// stayed registered all session. Those are gone: PostToolUse/Skill fires exactly
// once per invocation, so one call is one row. Installs dedupe differently, via
// a persistent marker file — see installReason().
import { appendFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

// No credential is sent, deliberately. This repo is public, so anything
// embedded here is world-readable and would stop only scanners that never read
// the source. The endpoint is built to be safe while open instead: per-IP rate
// limiting, a body cap, a fixed vocabulary, and a metadata key allowlist. See
// the route header in MobPulse before adding auth back here.
const DEFAULT_ENDPOINT = "https://data.moburst.ai/api/agent-skills/telemetry";
// PostToolUse blocks the turn until the hook returns, so this is dead wait for
// anyone who cannot reach the endpoint (offline, VPN, egress filter). A
// telemetry POST that has not answered in 1.5s is not going to.
const POST_TIMEOUT_MS = 1500;
const STDIN_TIMEOUT_MS = 1000;

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

/**
 * Where this plugin's files live.
 *
 * CLAUDE_CODE sets CLAUDE_PLUGIN_ROOT, but this script's own location is the
 * one thing that is always correct, so it is the fallback. Emission is gated on
 * resolving this (see isOwnSkill), and a wrong root would silently suppress
 * every event rather than merely blanking a version field.
 */
function pluginRoot() {
  if (process.env.CLAUDE_PLUGIN_ROOT) return process.env.CLAUDE_PLUGIN_ROOT;
  try {
    return path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  } catch {
    return null;
  }
}

/**
 * First-run detection, which is the closest thing to an "install" that exists.
 *
 * Claude Code has no install-time hook — nothing runs when someone adds a
 * plugin — so an install can only be inferred from the first session in which
 * this code executes. A marker file holds the plugin version it last reported.
 *
 * Returns null to stay silent, or a reason to report:
 *   "install"  first time this plugin has ever run on this machine
 *   "upgrade"  ran before, but at a different plugin version
 *
 * Deliberate consequences, worth knowing when reading the numbers:
 *   - Someone who installs and never opens Claude Code is never counted.
 *   - UNINSTALLS are invisible. Nothing runs to report them, so churn can only
 *     be inferred from a machine going quiet, never observed.
 *   - Wiping ~/.config/mobskills re-reports an install, so this is a close
 *     count rather than an exact one.
 *
 * Fail-soft in BOTH directions: if the marker cannot be read we stay silent
 * rather than re-report every session, and if it cannot be written we still
 * report (an over-count is better than never learning about the install).
 */
async function installReason(version) {
  // identityDir, NOT dataDir: dataDir follows CLAUDE_PLUGIN_DATA and varies by
  // install path, which already caused one machine to mint two device ids. An
  // install marker kept there would re-report an "install" per path.
  // An unresolvable version would be written as "unknown" and then look like an
  // upgrade the moment it resolves. Better to report nothing this session.
  if (!version) {
    log("plugin version unresolvable; not claiming an install");
    return null;
  }

  const marker = path.join(identityDir, "installed");
  let previous = null;
  try {
    // A blank or truncated marker is not a previous version — treating "" as
    // one would label a genuine first install as an upgrade.
    previous = (await readFile(marker, "utf8")).trim() || null;
  } catch (err) {
    if (err?.code !== "ENOENT") {
      log(`install marker unreadable (${err?.code ?? "unknown"}); staying silent`);
      return null;
    }
  }

  if (previous === version) return null;

  try {
    await mkdir(identityDir, { recursive: true });
    if (previous === null) {
      // Exclusive create: two sessions starting together would otherwise both
      // read ENOENT and both report, double-counting one machine. Whoever loses
      // the race gets EEXIST and stays quiet.
      await writeFile(marker, version, { encoding: "utf8", flag: "wx" });
    } else {
      await writeFile(marker, version, "utf8");
    }
  } catch (err) {
    if (err?.code === "EEXIST") {
      log("another session claimed the install first; skipping");
      return null;
    }
    // Could not persist — report anyway; a duplicate beats a silent install.
  }
  return previous === null ? "install" : "upgrade";
}

/**
 * Who ran the skill, best effort.
 *
 * Reads the local git identity — the same string that already appears on every
 * commit that person makes, so it exposes nothing new about them. It is NOT
 * proof of identity: this endpoint is unauthenticated by design (the plugin
 * ships from a public repo and holds no credential), so a determined user could
 * send any address. Good enough for "who should I ask about this skill", not
 * for anything consequential.
 *
 * Opt out with MOBSKILLS_TELEMETRY_IDENTIFY=0, or `identify: false` in config.
 */
async function currentUser() {
  if (process.env.MOBSKILLS_TELEMETRY_IDENTIFY === "0" || config.identify === false) return null;
  try {
    const { execFile } = await import("node:child_process");
    const email = await new Promise((resolve) => {
      execFile("git", ["config", "--get", "user.email"], { timeout: 800 }, (err, stdout) => {
        resolve(err ? "" : String(stdout).trim());
      });
    });
    // Must be an address, and must survive the ingest's metadata value shape.
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 120) return null;
    // Company addresses only. This plugin ships from a PUBLIC marketplace repo,
    // so anyone may install it; sending a stranger's personal git email to a
    // Moburst endpoint would be collecting third-party PII with no notice and
    // no consent. The feature only ever needed "which colleague uses this".
    return email.toLowerCase().endsWith("@moburst.com") ? email : null;
  } catch {
    return null;
  }
}

/**
 * Did the skill actually run?
 *
 * Only answerable because this is a PostToolUse hook. Under PreToolUse the
 * previous code asserted "ok" before the tool had run — so a skill the user
 * denied at the permission prompt, or that errored, was recorded as a clean
 * success, and the outcome column could only ever hold one value.
 */
function outcomeFrom(payload) {
  const r = payload?.tool_response;
  if (r && typeof r === "object" && (r.is_error === true || r.error)) return "error";
  return "ok";
}

/**
 * True when `slug` is a skill shipped by THIS plugin.
 *
 * The hook fires for EVERY Skill call on the machine — other plugins' skills
 * and the user's own personal ones included — so this is what stops us
 * reporting someone else's skill as ours.
 *
 * Only a genuine "no such file" means not-ours. Any other read failure is an
 * environment problem, and silently dropping real telemetry for it would
 * reproduce the exact bug this release fixes, so those fail OPEN and are logged.
 */
async function isOwnSkill(slug) {
  const root = pluginRoot();
  if (!root) return true;
  try {
    await readFile(path.join(root, "skills", slug, "SKILL.md"), "utf8");
    return true;
  } catch (err) {
    if (err?.code === "ENOENT") return false;
    log(`ownership check failed (${err?.code ?? "unknown"}); assuming ours`);
    return true;
  }
}

/** This plugin's own version, so the portal can tell who is still on an old
 *  build. Distinct from the SKILL's version, which every skill pins itself. */
async function pluginVersion() {
  const root = pluginRoot();
  if (!root) return null;
  try {
    const raw = await readFile(path.join(root, ".claude-plugin", "plugin.json"), "utf8");
    const v = JSON.parse(raw)?.version;
    return typeof v === "string" ? v : null;
  } catch {
    return null;
  }
}

async function skillVersion(slug) {
  // pluginRoot(), not the bare env var: three functions read files under the
  // plugin root and they must agree on how to find it, or this one silently
  // reports a null version wherever the others succeed.
  const root = pluginRoot();
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

/**
 * Which skill this event is about.
 *
 * Prefer the hook payload over --slug. The PostToolUse/Skill hook is registered
 * ONCE for all skills (there is no per-skill matcher on a tool name), so the
 * slug can only come from the payload:
 *
 *   { tool_name: "Skill", tool_input: { skill: "mobskills:verify-plan" } }
 *
 * Three outcomes, and the difference between the last two matters:
 *   { kind: "ours", slug }  — a mobskills skill (or an unnamespaced one, which
 *                             the caller then confirms against our skills dir)
 *   { kind: "foreign" }     — someone else's skill. Silence is CORRECT here and
 *                             it is the common case: this hook sees every Skill
 *                             call on the machine.
 *   { kind: "unreadable" }  — it IS a Skill call but no skill name could be
 *                             found. That means the payload shape changed, and
 *                             it must be loud (see the canary in main).
 */
function classifySkill(payload) {
  if (!payload || payload.tool_name !== "Skill") return { kind: "foreign" };
  const raw = payload?.tool_input?.skill;
  if (typeof raw !== "string" || !raw) return { kind: "unreadable" };

  const [ns, name] = raw.includes(":") ? raw.split(":", 2) : [null, raw];
  if (ns !== null && ns !== "mobskills") return { kind: "foreign" };
  if (!name) return { kind: "unreadable" };
  // A name we cannot parse is only an ALARM if it claimed our namespace. An
  // unnamespaced oddity ("_scratch", ".wip", non-ASCII) is someone's personal
  // skill, and every mobskills slug matches this pattern by construction — so
  // treating those as unreadable would fire the canary on other people's
  // skills from every machine, which is the noise that makes an alarm useless.
  if (!/^[a-z0-9][a-z0-9._-]*$/i.test(name)) {
    return ns === "mobskills" ? { kind: "unreadable" } : { kind: "foreign" };
  }
  return { kind: "ours", slug: name };
}

async function main() {
  const payload = await readStdinJson();

  // --slug still wins so the script stays runnable by hand and from any
  // future non-tool hook; the payload is the normal path.
  const classified = classifySkill(payload);

  // Canary, deliberately narrow. Silent telemetry is indistinguishable from
  // telemetry nobody triggered, and that ambiguity is exactly what hid the 0.4.0
  // bug. So a Skill call we cannot READ reports an `unknown` row — a loud, cheap
  // alarm in the portal. A Skill call belonging to ANOTHER plugin is not an
  // alarm, it is the common case, and must stay silent or we would drown the
  // table in noise from every other plugin on every machine.
  const unattributed = !args.slug && classified.kind === "unreadable";
  const slug = args.slug ?? (classified.kind === "ours" ? classified.slug : unattributed ? "unknown" : null);

  if (!slug) {
    log("not one of our skills; nothing to report");
    if (debug) await writeDebugDump(payload, null);
    return;
  }

  // The hook fires for EVERY Skill call on the machine, including other
  // plugins' and the user's own personal skills. An unnamespaced skill that
  // happens to share a name with ours would otherwise be reported as ours, so
  // confirm the slug actually exists in this plugin before claiming it.
  if (classified.kind === "ours" && !args.slug && !(await isOwnSkill(slug))) {
    log(`skill "${slug}" is not part of this plugin; not reporting`);
    if (debug) await writeDebugDump(payload, null);
    return;
  }

  if (process.env.MOBSKILLS_TELEMETRY === "0" || config.enabled === false) {
    log("opted out (MOBSKILLS_TELEMETRY=0 or config enabled:false)");
    if (debug) await writeDebugDump(payload, null);
    return;
  }

  // Install events are emitted once per machine per plugin version. SessionStart
  // fires on EVERY session, so without this the table would gain a row per
  // session and "installs" would just be a session counter under another name.
  const eventType = args.type ?? "usage";
  // Read once: installReason() and the metadata below both want it.
  const buildVersion = await pluginVersion();
  let installKind = null;
  if (eventType === "install") {
    installKind = await installReason(buildVersion);
    if (!installKind) {
      log("already reported an install for this plugin version; skipping");
      return;
    }
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
  const who = await currentUser();

  const body = {
    type: eventType,
    source: "runtime",
    slug,
    version: eventType === "install" ? null : await skillVersion(slug),
    surface,
    outcome: outcomeFrom(payload),
    agent: "claude",
    device_id: await deviceId(),
    metadata: {
      event: typeof payload?.hook_event_name === "string" ? payload.hook_event_name : "unknown",
      trigger: args.trigger ?? "slash",
      // Raw entrypoint enum (e.g. "cli"). Not sensitive — it identifies the
      // client, never the user or their work — and it is how we learn what
      // Desktop reports so surface detection above can be completed.
      session_kind: entrypoint || "unset",
      // Which plugin BUILD produced this, as distinct from `version` above,
      // which is the skill's own. Every skill sits at 1.0.0, so without this
      // there is no way to see who is still running an old, silent build.
      // A dedicated key, not `note`: that one is documented as a free-form
      // spike/debug marker and historical rows already carry arbitrary values,
      // which would pollute the "By plugin build" breakdown.
      plugin_version: buildVersion ?? "unknown",
      ...(unattributed ? { reason: "no_slug" } : {}),
      ...(installKind ? { reason: installKind } : {}),
      ...(who ? { user: who } : {}),
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
