# Moburst Skills

Source of truth for Moburst's agent **Skills** — reusable instruction packs for
Claude and Codex (same `SKILL.md` format), shipped as a Claude Code plugin.

This repo holds the plugin (skills + telemetry hooks), the marketplace manifest
that installs it, and the frontmatter schema — nothing else. The browsing,
editing, and usage-analytics UI lives in MobPulse under **Agent Skills**, which
reads this repo through the GitHub API — a skill merged here shows up there with
no deploy and no sync job.

## Install

```sh
claude plugin marketplace add Mobi-Moburst/MobSkills   # one time
claude plugin install mobskills@mobskills
```

Then invoke a skill by its namespaced name:

```
/mobskills:verify-plan
```

The bare `/verify-plan` also works, but only as an alias, and only while nothing
else installed claims that name — Claude Code drops the alias on a collision.
The namespaced form always resolves.

In Claude Desktop, add the marketplace under **+ → Plugins → Browse plugins →
Add marketplace** with the same `Mobi-Moburst/MobSkills`, then install MobSkills
from the list. Installing gets you every skill, not just one.

## Layout

```
.claude-plugin/marketplace.json    # marketplace entry, points at ./plugin
plugin/.claude-plugin/plugin.json  # plugin manifest (version lives here)
plugin/hooks/hooks.json            # usage + install telemetry hooks
plugin/scripts/                    # the telemetry reporter + its node-resolver
                                   #   wrapper (.sh) — bare `node` does not
                                   #   resolve in Claude Desktop's GUI PATH,
                                   #   so the wrapper is not redundant
plugin/skills/<slug>/SKILL.md      # one folder per skill — frontmatter + body
plugin/skills/<slug>/              # optional supporting dirs — references/,
                                   #   scripts/, or whatever the skill needs
                                   #   (moburst-deck-template ships assets/,
                                   #   fonts/, preview/, slides/, ui_kits/)
schema/skill.schema.json           # frontmatter contract (MobPulse mirrors
                                   #   these rules in TypeScript, it does not
                                   #   fetch this file)
```

## SKILL.md frontmatter

```yaml
name: verify-plan              # kebab-case, must match the folder name (required)
description: Use when ...      # trigger-oriented; how the agent selects the skill (required)
targets: [claude, codex]       # platform compatibility — claude | codex (required)
runtime: local                 # local (CLI/Codex) | hosted (Anthropic sandbox); default local
version: 1.0.0                 # semver — must move forward on every edit
visibility: internal           # public | internal | department
departments: [bi]              # required only when visibility = department
status: active                 # active | deprecated (badge in MobPulse).
                               #   No editor control — set it by commit or PR.
                               #   Anything not `deprecated` reads as active.
tags: [planning, review]
owner: someone@moburst.com
```

## Telemetry

Installing the plugin turns on usage reporting, so the team can see which skills
are worth maintaining. It is metadata only: no prompts, no file paths, no
arguments, no skill output ever leaves the machine.

Each event carries the skill slug, its version, the plugin build, whether the
run succeeded, whether it ran in the CLI or Desktop, and an anonymous
per-machine id. Running a skill sends one event; the first session after an
install or upgrade sends one more.

There are two reporting paths. Locally, `plugin/hooks/hooks.json` fires after
the Skill tool call. In Anthropic's hosted sandbox no hook runs, so the
`## Usage reporting` section in each skill body does it instead — which is why
that section must survive every edit.

It also sends your `git config user.email`, but **only if it ends in
`@moburst.com`** — the repo is public, and nobody outside the company should
have their address collected by installing a plugin.

Turn it off:

```sh
export MOBSKILLS_TELEMETRY=0            # send nothing at all
export MOBSKILLS_TELEMETRY_IDENTIFY=0   # send events, but no email
```

Or in `~/.config/mobskills/config.json`:

```json
{ "enabled": false, "identify": false }
```

## Adding or editing a skill

1. Create `plugin/skills/<your-skill>/SKILL.md` with the frontmatter above
   (`name` must match the folder). Fork and open a PR, or use the MobPulse
   editor if you have access — it commits for you.
2. Bump `version` on every edit. Reusing a version makes two revisions
   indistinguishable in analytics, retroactively. The MobPulse editor enforces
   this server-side; on the PR path nothing does, so it is on the reviewer.
3. **Keep the `## Usage reporting` section at the end of the body.** For
   `runtime: hosted` skills it is the *only* thing that reports usage: the
   `PostToolUse` hook cannot run inside Anthropic's sandbox. Frontmatter keys
   the editor does not own survive a save (MobPulse merges rather than
   overwrites), but the body is replaced wholesale — drop that section and the
   skill goes silently dark.
4. Bump `plugin/.claude-plugin/plugin.json` when the hooks or scripts change;
   that is the version installed clients compare against.

Invalid frontmatter is reported in MobPulse and the skill is not indexed.

## Skills

| Skill | Targets | Runtime | Description |
|-------|---------|---------|-------------|
| [moburst-deck-template](plugin/skills/moburst-deck-template/SKILL.md) | claude | hosted | Re-skin decks into Moburst-branded PPTX. |
| [seo-audit](plugin/skills/seo-audit/SKILL.md) | claude, codex | local | Keyword research, on-page, content gaps, technical checks, competitor benchmark. |
| [verify-plan](plugin/skills/verify-plan/SKILL.md) | claude, codex | local | Rigorous self-review of an implementation plan before coding. |
