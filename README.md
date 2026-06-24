# Moburst Skills Repository

Source of truth for Moburst's agent **Skills** — reusable instruction packs for
Claude, Codex, and (as copy-paste instructions) ChatGPT. A web portal (MobSkills)
is being built on top of this repo to present, manage, version, and measure them.

## Layout

```
skills/<slug>/SKILL.md   # one folder per skill — required frontmatter + body
skills/<slug>/references # optional supporting docs
skills/<slug>/scripts    # optional helper scripts
schema/skill.schema.json # frontmatter contract (validated in CI)
.github/workflows/lint-skills.yml
```

## SKILL.md frontmatter

```yaml
name: verify-plan              # kebab-case, must match the folder name (required)
description: Use when ...      # trigger-oriented; how the agent selects the skill (required)
targets: [claude, codex]       # platform compatibility — claude | codex | chatgpt (required)
version: 1.0.0                 # semver (optional; defaults from latest git tag)
visibility: internal           # public | internal | department
departments: [bi]              # required only when visibility = department
tags: [planning, review]
owner: someone@moburst.com
```

## Adding a skill

1. Create `skills/<your-skill>/SKILL.md` with the frontmatter above.
2. Open a PR. The `lint-skills` check validates frontmatter against the schema and
   confirms `name` matches the folder.
3. On merge, the MobSkills portal re-indexes the repo automatically.

## Skills

| Skill | Targets | Description |
|-------|---------|-------------|
| [verify-plan](skills/verify-plan/SKILL.md) | claude, codex | Rigorous self-review of an implementation plan before coding. |
