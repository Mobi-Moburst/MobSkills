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
