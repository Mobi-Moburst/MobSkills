# Moburst Skills Repository

Source of truth for Moburst's agent **Skills** — reusable instruction packs for
Claude and Codex (same `SKILL.md` format). A web portal (MobSkills) is being built
on top of this repo to present, manage, version, and measure them.

## Layout

```
skills/<slug>/SKILL.md   # one folder per skill — required frontmatter + body
skills/<slug>/references # optional supporting docs
skills/<slug>/scripts    # optional helper scripts
schema/skill.schema.json # frontmatter contract (validated by the MobSkills portal)
```

## SKILL.md frontmatter

```yaml
name: verify-plan              # kebab-case, must match the folder name (required)
description: Use when ...      # trigger-oriented; how the agent selects the skill (required)
targets: [claude, codex]       # platform compatibility — claude | codex (required)
version: 1.0.0                 # semver (optional; defaults from latest git tag)
visibility: internal           # public | internal | department
departments: [bi]              # required only when visibility = department
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

## Adding a skill

1. Create `skills/<your-skill>/SKILL.md` with the frontmatter above (`name` must
   match the folder).
2. Open a PR (or use the MobSkills portal editor, which opens one for you).
3. The MobSkills portal validates the frontmatter against `schema/skill.schema.json`
   at sync time — invalid skills are reported and not indexed — and re-indexes the
   repo automatically on merge.

## Skills

| Skill | Targets | Description |
|-------|---------|-------------|
| [verify-plan](skills/verify-plan/SKILL.md) | claude, codex | Rigorous self-review of an implementation plan before coding. |
