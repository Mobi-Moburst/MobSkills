# CLAUDE.md

Guidance for working in this repo. Keep it short and high-signal — add a line only
when something is non-obvious or has bitten us.

## What this is

**MobSkills** — a standalone web portal over this GitHub repo for discovering,
managing, versioning, and measuring Moburst's agent **Skills** (Claude + Codex).
The repo is BOTH the skills content (`skills/`) AND the Next.js app (root). The repo
is the **source of truth for skill content**; a database (Supabase, not yet created)
will hold the index, analytics, and permissions.

It is a separate product from **MobPulse** (`~/Documents/MobPulse`) — do not merge
them. We mirror MobPulse's design and may borrow patterns, nothing more.

## Commands

```bash
npm run dev          # local dev at http://localhost:3000  (/ → /skills)
npm run build        # production build — also runs lint + typecheck; use as the gate
npm run lint         # eslint
npx tsc --noEmit     # typecheck only
```

There are no tests yet. Treat a clean `npm run build` as the pre-commit bar.

## Architecture

- **Skill content**: `skills/<slug>/SKILL.md` (YAML frontmatter + Markdown body),
  optional `references/`, `scripts/`. One folder per skill; `name` must equal the folder.
- **Frontmatter contract**: `schema/skill.schema.json` (JSON Schema draft 2020-12) is
  the SINGLE source of truth for valid frontmatter. `lib/frontmatter.ts` validates
  against it (Ajv-2020). Change the schema, not ad-hoc checks.
- **Reading skills (Phase 1)**: `lib/skills.ts` reads the **local filesystem** (the app
  ships colocated with `skills/`). Phase 2 swaps in GitHub API + Supabase for live sync.
- **App**: Next.js 15 App Router, React 19, Tailwind v4. Pages in `app/(catalog)/skills`,
  API routes in `app/api`, UI in `components/`, server logic in `lib/`.

## Conventions

- **Targets are `claude` and `codex` only** — ChatGPT was intentionally dropped. The
  filter UI is data-driven from `getFacets()`, so it auto-reflects targets in use.
- **Design = MobPulse dark theme.** Use the `@theme` tokens in `app/globals.css`:
  `bg-card`, `border-card-border`, `text-text-primary/secondary/muted`, gold `accent`.
  Headings use `font-heading` (Outfit); body is DM Sans. Cards: `rounded-2xl border
  border-card-border bg-card/80 backdrop-blur-xl` + hover lift + `animate-fade-in-up`.
- Server Components by default; `"use client"` only where there's interactivity
  (`skills-browser.tsx`, `consume-actions.tsx`). `lib/skills.ts` + `lib/frontmatter.ts`
  are `server-only`.
- Strip heavy fields (`body`, `files`) before passing skills to client components.

## Gotchas (these bit us)

- **Pushing to the repo needs a CLASSIC PAT, not fine-grained.** `Mobi-Moburst` is a
  personal account and the dev account is a collaborator; fine-grained PATs 403 here,
  and `gh auth setup-git` adds a github.com credential helper that overrides the
  keychain. The repo has local git config forcing osxkeychain (classic PAT). If a push
  401/403s, the token expired — recreate a classic PAT (`repo`+`workflow`) and re-store.
- **No CI lint anymore** — validation lives in the portal (`lib/frontmatter.ts`), run at
  load/sync time. Invalid skills are `console.warn`'d and skipped, not indexed.
- **Vercel**: the download route + detail page read `skills/**` at runtime/build via
  `fs`; `next.config.ts` `outputFileTracingIncludes` forces those files into the bundle.
  Keep it if you add routes that read `skills/`.
- **DB is Supabase** (Moburst's paid account, MobPulse uses it) — a separate Supabase
  project, not yet created. Don't introduce Neon/other Postgres.

## Plan & history

Approved phased plan: `~/.claude/plans/we-are-going-to-woolly-yao.md` (Phase 0–1 done;
Phase 2 = Supabase + GitHub sync; 3 = auth/RBAC; 4 = analytics; 5 = editor/versioning UI).
