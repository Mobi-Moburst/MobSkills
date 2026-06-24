# MobSkills — Skills Repository & Management Portal (Detailed Plan)

> ## ⚠️ Amendments (supersede anything below; updated 2026-06-24 after dual-engine review)
> When these conflict with text further down, **these win**.
>
> 1. **DB = Supabase**, not Neon (Moburst paid account; MobPulse uses it). A separate
>    Supabase project — **not yet created → Phase 2 is blocked on it.**
> 2. **Phase 3 auth = Supabase Auth + Row-Level Security**, not Auth.js. Supabase
>    collapses DB + auth + per-department authz into one: Google SSO restricted to
>    `@moburst.com`; RLS policies enforce `public/internal/department` visibility in the
>    database, not hand-written `lib/access.ts` filters in every query. Keep `lib/access.ts`
>    only as a thin helper over RLS-scoped queries. Drizzle optional (may use Supabase SQL).
> 3. **Targets = Claude + Codex only.** ChatGPT dropped (schema + types already updated).
> 4. **Localhost-only for now; Vercel deferred.** The GitHub **push webhook can't reach
>    the app** → Phase 2 live-sync default is the **manual Resync button + cron**; the
>    webhook lands later with a public URL / dev tunnel.
> 5. **Phase 1→2 is not a drop-in swap.** Catalog/detail are currently `force-static` +
>    synchronous (`lib/skills.ts` filesystem reader). A Supabase/GitHub-backed layer is
>    async + dynamic → flip those pages off `force-static`/`dynamicParams=false`, and
>    **never statically generate department-scoped skills** (would leak them).
> 6. **`status` is NOT yet validated** by `lib/frontmatter.ts` (schema has
>    `additionalProperties:true`). Validate explicitly there if we want it enforced.
> 7. **Versioning — simpler first step:** store current `version` + git SHA in the DB;
>    add per-skill `<slug>@<semver>` tags + history only when the Phase-5 version UI needs
>    pinned historical downloads.
> 8. **GitHub write credential:** classic PAT (`repo`+`workflow`). Fine-grained PATs 403
>    on this personal-account collaborator repo — do NOT plan on them for prod.

## Context

Moburst is centralizing its agent **Skills** in `github.com/Mobi-Moburst/MobSkills`
and wants a web interface on top of it. The original ask, verbatim, is an interface that:

1. **Presents** the skills
2. **Manages** them
3. **Updates** them when needed
4. **Version-controls** them
5. **Analytics** — who downloads them
6. **Manages skills per user / department**

Primary target is **Claude** (Claude Code / agents); the format must also allow
**Codex** (same `SKILL.md` format) and **ChatGPT** (consumed as copy-paste
instructions) — so platform is a first-class, filterable field (`targets:`).

**Already done (Phase 0, verified):** the repo is seeded with the `verify-plan`
skill and `schema/skill.schema.json`. This fixes the content contract the portal
reads: `skills/<slug>/SKILL.md` (YAML frontmatter + body), optional `references/`,
`scripts/`.

**Decision — no GitHub Action CI for now.** Frontmatter validation lives in the
**portal** (in the editor and at sync time, via `lib/frontmatter.ts` reusing the
same `schema/skill.schema.json`); broken skills simply don't get indexed and the
admin UI reports why. The seed `.github/workflows/lint-skills.yml` + script will be
removed. CI + a `main` ruleset get reintroduced in Phase 6 when direct-commit
safety matters.

**Design principle:** GitHub is the **source of truth for skill content** (git =
free, real version control). Postgres holds only what git can't: users, departments,
permissions, and analytics events. The portal never becomes a second source of truth
for content — it always reflects the repo.

**Analytics scope.** Req. #5 ("who downloads") is fully satisfied by **portal
events** (view/copy/download/install bound to the signed-in user) — that's the
committed deliverable. **Runtime usage telemetry** — recording when a skill is
actually *invoked* by an agent — is a clearly-labeled **experimental stretch
(Phase 6)**, because no agent runtime exposes a reliable native "skill invoked"
event; we treat it as best-effort and verify *real agent emission*, not just the
ingest endpoint, before claiming it.

**Dual-engine verification applied (two rounds; Claude+Codex).** Round 1 (58%)
fixed per-skill versioning, `vercel.json`, data-layer authz, dept resolution, and
webhook HMAC. Round 2 (52%) added these fixes, now incorporated: zip **the skill
folder** in-memory (not a whole-repo proxy that hits Vercel's 4.5 MB body limit);
**explicit `session:{strategy:"jwt"}`** (Auth.js adapter otherwise defaults to DB
sessions); **flag** unknown department slugs for admin instead of auto-creating
(typo safety); reconcile frontmatter `owner` → DB `owner_email`; mark runtime
telemetry experimental; and sync-time validation as the real validation net.

---

## Tech stack

| Concern | Choice | Why |
|---|---|---|
| Framework | **Next.js 15 (App Router) on Vercel**, version pinned | Stable `middleware.ts` semantics (Next 16 renames it to `proxy.ts`); App Router RSC for GitHub reads, route handlers for actions. Authz lives in the data layer regardless, so middleware/proxy is only defense-in-depth |
| UI | **shadcn/ui + Tailwind**, `react-markdown` (+ `rehype-highlight`) for SKILL.md, **Recharts** for analytics | Consistent, quick to build |
| DB | **Neon Postgres** (Vercel Marketplace) + **Drizzle ORM** | Serverless Postgres, typed queries/migrations |
| Auth | **Auth.js (NextAuth v5)**, Google restricted to `@moburst.com`, **Drizzle adapter with explicit `session:{strategy:"jwt"}`** (adapter alone defaults to DB sessions); JWT carries `{userId, role, department_id}`, refreshed from DB in the `jwt` callback | Free, self-hosted, we own the user→department mapping (req. #6). First login upserts a `users` row. *Clerk is the managed alternative.* |
| GitHub | **Octokit** — read content/trees/commits/tags; write via branch+commit+PR | Source of truth integration |
| Download | **Zip the skill folder in-memory** (`jszip`): list just `skills/<slug>/**` via the Contents API (a handful of small files) → zip → stream. Whole-repo **zipball redirect** only as fallback | A single skill is tiny, so this stays well under Vercel's **4.5 MB response limit**; scoping to one folder avoids the recursive-tree truncation (100k/7 MB) that a whole-repo walk hits |

---

## Architecture

```
                         Next.js app (Vercel)
 GitHub repo (truth) ──▶  Server Components  ◀── Neon Postgres
  skills/<slug>/SKILL.md   /skills (catalog)       users, departments
  references/, scripts/    /skills/[slug] (detail) roles, skill_department_access
  per-skill versions       /admin (manage)         skill index cache + versions
  (<slug>@<semver>)        /admin/analytics        events (view/copy/download/
        ▲   │              API: sync, download(zip),         install/usage)
        │   │                   events, telemetry, skills CRUD→PR
   push webhook (HMAC) ───▶ /api/sync  (re-index repo → Postgres)
        ▲                   /api/telemetry ◀── runtime usage hook (experimental)
   PR/commit (Octokit) ◀── /admin editor   Auth.js: Google SSO @moburst.com → JWT{role,dept}
```

**Index sync (`/api/sync`):** the catalog reads a Postgres **cache** of skill
metadata (fast, joinable with analytics/permissions), refreshed by: (a) a GitHub
**push webhook** (HMAC-verified with `GITHUB_WEBHOOK_SECRET`; idempotent upserts so
retries are safe), (b) a manual **Resync** button in admin, (c) a daily **Vercel
Cron** (configured in `vercel.json`). The handler walks `skills/*/SKILL.md` via
Octokit, validates frontmatter with `lib/frontmatter.ts` (skips + reports invalid
skills — this **sync-time validation is the real safety net** now that CI is
removed; broken skills never get indexed), and upserts `skills` + `skill_versions`
(idempotent). **Department resolution:** frontmatter `departments` are free-string
slugs (`departments.slug` is UNIQUE); sync matches each to a `departments.id`. An
**unknown slug is flagged for admin review, NOT auto-created** (prevents typos like
`enginering` silently spawning departments) — the skill stays hidden until an admin
confirms/creates the department. `owner` (frontmatter) maps to the `owner_email`
column.

---

## Data model (Drizzle / Postgres) — `lib/db/schema.ts`

- **departments** (id, slug, name) — e.g. `bi`, `performance`, `creative`, `aso`
- **users** (id, email[unique], name, image, department_id→departments, role
  enum[`admin`|`editor`|`viewer`], created_at) — row created on first SSO login
- **skills** (id, slug[unique], name, description, repo_path, current_version,
  targets text[], tags text[], visibility enum[`public`|`internal`|`department`],
  owner_email (mapped from frontmatter `owner`), status enum[`active`|`deprecated`],
  default_branch_sha, updated_at) — synced from repo, never hand-edited as truth
- **skill_versions** (id, skill_id→skills, version, git_sha, changelog, created_at)
  — one row per **per-skill tag** (`<slug>@<semver>`) or, until tags exist, per
  indexed commit that changed the skill folder (version = frontmatter `version`,
  fallback short SHA). Repo-level tags are NOT assumed to map to a skill.
- **skill_department_access** (skill_id, department_id) — composite PK; rows only
  when `visibility = department`
- **events** (id, user_id→users[nullable], skill_id→skills, version,
  type enum[`view`|`copy`|`download`|`install`|`usage`],
  source enum[`portal`|`runtime`], target text, agent text[nullable], created_at)
  — the analytics fact table. Portal rows (the committed req. #5 answer) come from
  consume actions; `source=runtime`+`type=usage` rows come from the **experimental**
  telemetry hook (Phase 6).

Indexes: `events(skill_id, created_at)`, `events(type, created_at)`,
`events(source, created_at)`, `skills(visibility)`.

> `status` is portal-derived; the seed schema has `additionalProperties: true`, so
> `lib/frontmatter.ts` validates `status` (and other portal fields) explicitly
> rather than relying on the JSON Schema to reject them.

---

## Requirement → implementation map

### 1. Present the skills
- `app/(catalog)/skills/page.tsx` — grid/list of skill cards (name, description,
  target badges, department tag, version, tags). **Filters:** full-text search,
  target (`claude`/`codex`/`chatgpt`), department, tag, status. Server Component
  reads the `skills` cache filtered by the viewer's access (`lib/access.ts`).
- `app/(catalog)/skills/[slug]/page.tsx` — detail: rendered SKILL.md (`react-markdown`),
  frontmatter panel, file tree (`references/`, `scripts/`), version selector,
  **Consume** actions, and "Open in GitHub" link. Logs a `view` event.
- Reusable: `components/skill-card.tsx`, `components/skill-filters.tsx`,
  `components/markdown.tsx`, `components/target-badge.tsx`.

### 2. Manage them  &  3. Update them
- `app/admin/skills/page.tsx` + `app/admin/skills/[slug]/edit/page.tsx` — form-based
  editor (frontmatter fields + Markdown body) gated to `editor`/`admin`.
- **Save = PR, not direct write** (keeps git review): `POST /api/skills`
  / `PUT /api/skills/[slug]` use Octokit to create a branch, commit the changed
  `SKILL.md`, and open a PR; merge triggers the webhook → re-sync.
  `lib/github.ts` holds `createSkillPR()`.
- **Live validation:** reuse `schema/skill.schema.json` client + server side
  (`lib/frontmatter.ts` = parse + Ajv-2020 validate) so
  the editor blocks invalid frontmatter before the PR.
- **Deprecate/archive:** sets `status` via a frontmatter field + PR; deprecated
  skills are filtered out of the default catalog view.

### 4. Version control
- Git is the backbone, but **versions are per-skill, not repo-level**. Two sources,
  in priority order: (a) tags following the convention **`<slug>@<semver>`** (e.g.
  `verify-plan@1.2.0`); (b) until such tags exist, the frontmatter `version` plus
  the commit SHA of each change to that skill's folder. `/api/sync` records these
  into `skill_versions` with `git_sha` + changelog.
- Detail page **version selector** lets users view/consume a specific version;
  download fetches the **zipball at that `git_sha`/tag** and extracts the folder.
- `lib/github.ts`: `listSkillVersions(slug)` (matching tags + commits touching the
  folder), `getSkillAtRef(slug, ref)`.

### 5. Analytics — who downloads (committed) + who uses (experimental)
- **Portal events (the committed req. #5 answer):** every consume action logs an
  `events` row (`view`/`copy`/`download`/`install`, `source=portal`) with `user_id`,
  `skill_id`, `version`, `target`. `POST /api/events`. *Identity-bound* analytics
  ("who") require auth, so they become meaningful in **Phase 4**; Phase 1 logs
  anonymous events (`user_id` null) as a placeholder.
- `app/admin/analytics/page.tsx` (Recharts): downloads over time, top skills,
  breakdown **by department / user / target**, per-skill drill-down. Queries the
  `events` fact table joined to `users`/`skills`.
- **Runtime usage telemetry — EXPERIMENTAL (Phase 6), the "skill-usage-tracker"
  idea made ours:** an opt-in hook (e.g. a Claude Code hook that fires when a
  MobSkills skill file is loaded; Codex parity TBD) POSTs to **`/api/telemetry`**
  (auth'd via a per-user token) recording `skill`/`version`/`agent`/user → stored as
  `events(type=usage, source=runtime)`, unlocking a **download→usage funnel**.
  Honest caveat: no runtime exposes a guaranteed "skill invoked" event, so this is
  best-effort; its Phase-6 acceptance test must exercise **real agent emission**,
  not just the endpoint. Not required for the core product.

### 6. Manage skills per user / department
- **Auth.js** Google SSO restricted to `@moburst.com` — reject others in the
  `signIn` callback (check `profile.email_verified` + the Google `hd` claim, not
  just the email suffix). **Drizzle adapter**; **JWT session** carries
  `{userId, role, department_id}`. First login upserts a `users` row; **admins
  assign role + department** in `app/admin/users/page.tsx`.
- **Access rules** (`lib/access.ts`) are enforced **at the data layer — in every
  catalog/detail/download/API query**, not in middleware alone (`middleware.ts` is
  defense-in-depth only; on Next 16 it would be `proxy.ts`):
  - `public` → everyone signed in; `internal` → any `@moburst.com` user;
    `department` → only users whose `department_id` ∈ `skill_department_access`
    (admins see all).
  - Roles: `viewer` (browse/consume), `editor` (+ create/edit via PR), `admin`
    (+ manage users, departments, visibility, resync).

### Consume flow (shared by 1/4/5)
- `GET /api/skills/[slug]/download?ref=<version>` → access check → list & fetch only
  `skills/<slug>/**` at `ref` (Contents API, few small files) → zip in-memory
  (`jszip`) → stream, with a size guard. Single skills are tiny, so this stays under
  Vercel's 4.5 MB response limit; whole-repo zipball redirect is the fallback. Logs
  `download`.
- **Copy** (clipboard SKILL.md) and **Install command** (documented `git`/`curl`
  snippet now; `npx mobskills add <slug>` CLI is Phase 6) each log their event.

---

## Build sequence (phases with acceptance criteria)

- **Phase 0 — Seed & contract** ✅ *done* — repo seeded with `verify-plan` +
  `schema/skill.schema.json`. (First implementation step: remove the seed
  `.github/workflows/lint-skills.yml` + script **and update `README.md`** to drop
  the lint-CI step so the docs match the no-CI decision.)
- **Phase 1 — Read-only portal (MVP).** Scaffold Next.js, `lib/github.ts` read layer,
  catalog + detail + filters, copy/zip-download with anonymous event logging, deploy
  to Vercel. *Done when:* the live preview shows `verify-plan`, filters work, and a
  download streams a valid zip.
- **Phase 2 — DB + sync.** Provision Neon, Drizzle schema + migrations, `/api/sync`
  + push webhook + manual Resync + cron. *Done when:* editing a skill in the repo
  updates the catalog within seconds without redeploy.
- **Phase 3 — Auth + RBAC (req. #6).** Auth.js Google SSO `@moburst.com`,
  users/departments, role/department admin UI, access filtering. *Done when:* a
  non-moburst account is rejected and a `department`-scoped skill is hidden from
  outsiders.
- **Phase 4 — Analytics (req. #5).** Wire `events` to the real signed-in `user_id`;
  build the dashboard (downloads/views over time, top skills, by department/user/
  target). *Done when:* a download by a known user appears in the by-department chart.
- **Phase 5 — Management/editing (req. #2/#3) + versioning UI (req. #4).** PR-based
  web editor with live validation, version history + version-pinned download,
  deprecate. *Done when:* saving in the editor opens a PR with valid frontmatter.
- **Phase 6 (optional) — Hardening + stretch:** reintroduce the `lint-skills` GitHub
  Action + a `main` branch **ruleset**; a `mobskills` CLI for one-line install; and
  the **experimental runtime usage telemetry** (`/api/telemetry` + agent hook +
  download→usage funnel). *Telemetry done when:* a real skill invocation in Claude
  Code emits a `usage` event for a known user (real emission, not just an endpoint
  POST).

---

## Critical files to create

Repo (exists): `skills/<slug>/SKILL.md`, `schema/skill.schema.json`.
(Remove `.github/workflows/lint-skills.yml` + `.github/scripts/lint-skills.mjs`.)

Portal (`/Users/eyal.levi/Documents/MobSkills`, alongside `skills/`):
- Pages: `app/(catalog)/skills/page.tsx`, `app/(catalog)/skills/[slug]/page.tsx`,
  `app/admin/{skills,users,analytics}/page.tsx`, `app/admin/skills/[slug]/edit/page.tsx`
- API: `app/api/skills/route.ts`, `app/api/skills/[slug]/route.ts`,
  `app/api/skills/[slug]/download/route.ts`, `app/api/events/route.ts`,
  `app/api/telemetry/route.ts` (runtime usage ingest),
  `app/api/sync/route.ts` (HMAC-verified webhook)
- Lib: `lib/github.ts`, `lib/frontmatter.ts` (ports the Ajv-2020 logic),
  `lib/db/schema.ts`, `lib/db/index.ts`, `lib/auth.ts`, `lib/access.ts`
- Config: `middleware.ts` (defense-in-depth), `drizzle.config.ts`,
  **`vercel.json`** (Cron config — NOT `vercel.ts`), `.env.local`
- Env vars: `DATABASE_URL`, `GITHUB_TOKEN` (classic PAT now; owner-account
  fine-grained for prod), `GITHUB_REPO`, `AUTH_SECRET`, `AUTH_GOOGLE_ID`,
  `AUTH_GOOGLE_SECRET`, `GITHUB_WEBHOOK_SECRET`, `TELEMETRY_INGEST_KEY`.

**Reuse:** the existing `schema/skill.schema.json` is the single source of the
frontmatter contract. Port the Ajv-2020 validation logic (from the now-removed
lint script) into `lib/frontmatter.ts` so the editor, API, and sync all validate
identically against that one schema.

---

## Verification (end-to-end)

1. **Local:** `npm run dev` → `/skills` lists `verify-plan`; detail renders the
   Markdown; target/department filters narrow results.
2. **Consume + analytics:** click Download → a small `.zip` containing only
   `verify-plan/` downloads (folder-scoped, under the 4.5 MB limit), and a `download`
   row appears in `events`; it shows on `/admin/analytics`.
3. **Sync:** push a second skill (e.g. convert `security-check`) with
   `visibility: department, departments: [newdept]` → it appears after the
   HMAC-verified webhook fires (no redeploy); `newdept` is **flagged for admin
   review, not auto-created**, and the skill stays hidden until an admin confirms it.
4. **Telemetry (Phase 6, experimental):** a real skill invocation in Claude Code
   emits a `usage` event for the signed-in user (verifies real emission, not just an
   endpoint POST).
5. **Auth/RBAC:** sign in with a non-`@moburst.com` Google account → rejected; a
   `department`-scoped skill is hidden from a user outside that department, visible to
   admins. Hitting the download API directly without access → 403 (data-layer check).
6. **Manage/update:** edit a skill in `/admin` → a PR opens on GitHub; deliberately
   break frontmatter → the editor rejects it and `/api/sync` skips it with an error
   in the admin UI.
7. **Deploy:** Vercel preview build succeeds; `/skills` loads repo data in production.

---

## Open decisions (sensible defaults chosen; easy to change)

- **Auth:** Auth.js (recommended — free, full control over departments) vs Clerk
  (managed invites/roles). Both keep departments in our DB.
- **GitHub credential for writes:** start with the classic PAT already configured;
  for production prefer a fine-grained PAT from the **Mobi-Moburst owner account**
  (Contents + PRs + Workflows R/W). See memory `git-push-credentials`.
- **Editing model:** PR-based (recommended, keeps review + lint gate) vs direct commit.
