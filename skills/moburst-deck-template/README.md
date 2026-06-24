# Moburst Design System

A complete brand + UI kit for **Moburst** — the AI‑Native Growth Operating System (gOS). This system is derived from the 2026 Investor Memorandum deck and is intended for building investor‑facing, sales‑facing, and internal artifacts in the same voice.

> *"The infrastructure is built. The growth is realized."*
> — Moburst Investor Memorandum 2026

---

## At a glance

| | |
|---|---|
| **What Moburst is** | A 13‑year‑old, M&A‑grown digital growth firm that has transformed into a tech‑led platform powered by a proprietary AI core ("gOS"). Marketing‑strategy, organic, creative, media‑buying and product‑dev — 25+ services, one stack. |
| **Brand voice** | Confident, precise, financially literate. Investor‑grade. Not playful, not "fun startup". |
| **Visual DNA** | Pure black canvas. Lime‑green keyline glow. Inter typeface. 3D‑rendered space / prism / rocket imagery used sparingly as hero objects. |
| **Signature accent** | `#B9E045` ("gOS lime") — used as a stroke, ring, axis line, and the one color you can rely on to mean *value, gain, KPI*. |
| **Logo** | The "M‑prism": four colored shards (cyan, yellow, green, pink) forming an M. The colorful mark is the brand. Wordmark optional. |

---

## Source materials

These were the inputs used to build this system. The reader may or may not have access; everything *needed* is mirrored into this project.

- `uploads/moburst-deck.pptx` — *Copy of Moburst Investor Deck 2026.* The primary source for typography, palette, photography, copy and slide layouts. 8 slides, all extracted to `extracted/`.
- `extracted/media/` — Raw images pulled from the deck (logos, backgrounds, 3D renders, animated prism GIF).
- `extracted/slides/` — Slide XML (canonical for re‑deriving any layout).
- `extracted/fonts/` — Inter & Inter‑Light TTFs that ship with the deck.

No Figma file or codebase was provided. Where extra components are needed (form inputs, etc.) the system extrapolates from the deck's existing vocabulary; nothing has been invented from whole cloth.

---

## Index — what's in this project

```
README.md                    ← you are here
SKILL.md                     ← portable skill entry-point
colors_and_type.css          ← single source of truth for tokens

fonts/                       ← Inter + Inter Light TTFs (shipped with deck)
assets/                      ← logos, backgrounds, 3D renders, prism GIF
preview/                     ← Design System tab specimen cards
slides/                      ← deck slide templates (1920×1080)
ui_kits/
  investor-deck/             ← interactive recreation of the deck
extracted/                   ← raw PPTX extraction (XML, media)
```

See **slides/index.html** for the deck templates and **ui_kits/investor-deck/index.html** for a clickable walkthrough of the full memorandum.

---

## Content fundamentals — how Moburst writes

The voice is **the founder‑CEO in front of a sovereign‑wealth LP committee** — not a startup blog. Confident, factual, slightly martial. Periods land hard.

**Tense & pronoun.** Mostly **first‑person plural ("we")** when discussing strategy, but the deck most often uses **third‑person institutional voice** ("Moburst justifies", "the gOS economic moat"). Avoid "you". Reader is addressed implicitly.

**Casing.** **Sentence case for everything** — including titles, slide headers, and section eyebrows when set as words. The big *display* type often uses **lowercase + a single italic / lime emphasis phrase** for rhythm, e.g.:

> 13 years of disciplined *evolution*.
> 2026 — the *financial inflection* point.
> Future‑proofing the *revenue mix*.

The italicized lime portion is the conceptual hinge of the slide. Sentences typically end with a **period** even in titles — that hard stop is a Moburst signature.

**Eyebrows.** When eyebrow labels are used (small uppercase tags), they are **UPPERCASE, LETTER‑SPACED ~0.18em**, in lime. Example: `PRIVATE · CONFIDENTIAL · INVESTMENT MEMORANDUM · 2026`. Middle dots (`·`) are the preferred separator.

**Numbers are characters.** Money and growth numbers are display‑sized, often lime, and reduce to the shortest form possible: `$125M`, `$25M`, `+75%`, `10×`, `$500M`. Never write "125 million dollars" — always `$125M`. The "M" capitalizes; lowercase "mn" appears occasionally (`$mn` on chart axes) but `M` is preferred in headline copy. "×" (multiply sign) over "x" for multiples (`10×`, `5×`).

**Sentence rhythm.** Short, declarative. Often two beats per line on hero slides:

> The infrastructure is built.
> The growth is realized.
> The $125M entry window is closing.

Bullet copy follows a **"Strategic Milestone: …  /  Financial Target: …"** label‑bolded pattern. The label is the noun, the colon is mandatory, the body sentence is one clause.

**Vocabulary.** Lean into operator / finance language: *moat, run‑rate, inflection, integration playbook, organic vs. inorganic, top‑line, EBITDA, multiple, value hub, AIaaS, AEO, ASO, CRO.* Lean away from: *journey, magical, delightful, unleash, empower, supercharge.* Marketing‑speak is the failure mode.

**No emoji. Ever.** The brand is investor‑grade. Unicode dots (`·`), em‑dashes (`—`), the multiply sign (`×`) and arrows (`→`) are the only allowed non‑alphanumeric punctuation flourishes.

**Footer stamp.** Every slide carries `PRIVATE · CONFIDENTIAL · INVESTMENT MEMORANDUM · 2026` in `--mb-fg-4` at 11px. Keep it.

---

## Visual foundations

### Color

The system is **monochrome dark plus one accent**. Lime (`#B9E045`) is the only color that should pull the eye. The four logo colors (cyan, yellow, green, pink) appear *only* in the M‑mark and the rare service‑category dot — never in body copy, never in callouts.

| Role | Token | Hex |
|---|---|---|
| Background | `--mb-ink` | `#000000` |
| Primary text | `--mb-fg-1` | `#FFFFFF` |
| Secondary text | `--mb-fg-3` | `#9CA3AF` |
| Footer / legal | `--mb-fg-4` | `#6B7280` |
| **Accent — KPI, axis, ring** | `--mb-lime` | `#B9E045` |
| Logo cyan | `--mb-cyan` | `#2DE4FF` |
| Logo yellow | `--mb-yellow` | `#FFE334` |
| Logo pink | `--mb-pink` | `#FF6671` |
| Service dot — emerald | `--mb-emerald` | `#10B981` |

### Type

**Inter** at 700 (display + body bold) and **Inter Light** at 300 (longer captions, deck body copy that needs breathing room). Italic Inter at 400 is used for the single emphasized phrase in display titles. The system never uses an additional family — no serif, no mono in user‑facing surfaces. Tracking is **tight** on display (`-0.035em`) and **loose** on eyebrows (`0.18em`).

Display sizes (1920×1080 canvas): Hero 96px / H1 72px / H2 56px / H3 40px / Body 20px / Eyebrow 12px / Footer 11px. Big numeric callouts go to 88‑128px.

### Backgrounds

Three repeating treatments — **never invent a new one** unless explicitly asked.

1. **Aurora void** *(default)* — pure black with a faint olive bloom in the bottom‑left corner and a fainter teal bloom in the upper‑right. Source: deck slide background. Reproduced as a CSS radial gradient (`.mb-bg-aurora`) and also available as `assets/bg-aurora.jpg`.
2. **Starfield** — black with very subtle white star noise. Used for the most "cinematic" hero slides (rocket reveal, $500M horizon). `assets/bg-starfield.png`, `.mb-bg-starfield`.
3. **Grid void** — black with a faint square graph texture. Used once on the "What we do" service‑stack slide. Implemented as a pure CSS grid pattern (`.mb-bg-grid` in `colors_and_type.css`); the original deck's grid asset shipped with the M‑prism baked in so it isn't reusable.

No light backgrounds. No gradients other than the aurora bloom. No animated backgrounds.

### Hero objects

Slides occasionally place a **single 3D‑rendered object** as the focal point: a glowing emerald gem (the M‑prism, abstracted), a constellation of white rockets ready for launch, the full multicolor M mark. These are photographed/rendered, not flat — they bring physical weight to an otherwise flat type composition. Use the assets we shipped (`img-rocket.png`, `img-gem-green.png`, `img-prism-mark.gif`). Do **not** generate SVG substitutes.

### Borders & cards

The deck's signature affordance is the **lime‑keyline rounded card** — a 20‑28px‑radius rounded rectangle, 1px lime border at ~55% alpha, with a soft outer lime glow (`--mb-glow-lime-soft`). Background is *near* the page color, not lighter — these cards float by their stroke, not by elevation contrast.

- Default radius: **20px** (`--mb-r-lg`). Capsules/chips use the pill radius.
- Quiet cards (no glow) use a `rgba(255,255,255,0.10)` stroke and `rgba(255,255,255,0.025)` fill.
- **Avoid** drop shadows on dark surfaces; the glow *is* the elevation. The only non‑glow shadow used is a long, very dark shadow under the hero object renders to ground them.

### Spacing & layout

4pt scale. Slides use a generous outer margin (~120px) and 64px between major blocks. The deck never feels dense — there is always more black space than content. When in doubt, add air.

Hero alignment: **center**. Title‑slide and section‑opener variants center both text and object. Content slides anchor copy to the **left third** and put data/visualization on the right two‑thirds — see slides 2, 5, 6.

### Motion

The deck itself is print‑oriented (PPTX), but the system implies a small motion language:

- **Reveals**: 520ms cubic‑bezier(0.16, 1, 0.3, 1), fade + 12px vertical drift up. Never bounce. Never scale > 1.04.
- **Hover** (on capsules / cards): 160ms ease‑out; border alpha lifts from 0.55 → 0.90, glow strengthens. No movement.
- **Press**: 160ms; lime fill at 90% opacity, no scale.
- **The prism mark itself rotates slowly** (asset is an animated GIF — keep it; do not redraw).

### Transparency & blur

Used **only** in two situations: (1) the glass header strip with `backdrop-filter: blur(20px)` over a `rgba(20,20,20,0.55)` panel, and (2) the soft glow halo behind the M‑mark / number callouts. Don't blur full slides; don't dim the background to fake depth.

### Iconography vibe

See **ICONOGRAPHY** below for the rules. Short version: Moburst uses **almost no icons**. Number, word, lime ring, dark canvas — that's the kit.

### Imagery vibe

When real imagery appears it is **cold, cinematic, slightly desaturated**, often on a black studio plate (the rockets, the gem). Never warm. Never bright. Never lifestyle. If a slide calls for a "photo", you almost certainly want a 3D render or a black‑background hero object, not a stock photograph.

---

## Iconography

**Moburst is a text‑and‑number brand.** The investor deck contains essentially **no UI icons** — no chevrons, no info dots, no industry pictograms. Numbered service categories use a 2‑digit prefix (`01`, `02`, `03`, …) rather than icon glyphs. Bullet items use a small lime dot (`•`) typeset as part of the text, not an SVG.

What we have, and what you should use:

| Need | Use |
|---|---|
| Section / category marker | Two‑digit lime number (`01`, `02`, …) |
| List bullet | Lime `•` or, when stronger, `▸` |
| Separator inline | Middle dot `·`, em‑dash `—`, or `→` |
| Arrow / flow direction | `→` typographic arrow, or a 1px lime curved SVG path |
| Multiplier | `×` (`U+00D7`) |
| Logo / mark | `assets/logo-moburst-color.png` (the four‑shard M lockup) |
| Animated brand object | `assets/img-services-loop.png` (services orchestrated by gOS — astronaut + infinity loop, still frame) |

If a future surface genuinely needs a UI icon system (settings, navigation, etc.), substitute **[Lucide](https://lucide.dev/)** at `1.5px` stroke, `--mb-fg-2` color, and flag the substitution to the user — there is no native Moburst icon set to copy from. Lucide's investor‑grade restraint is the closest match. Load from CDN:

```html
<script src="https://unpkg.com/lucide@0.469.0/dist/umd/lucide.min.js"></script>
```

**No emoji.** **No flag icons.** **No 3D pictograms.** The only "decorative" graphic is the lime ring + glow, which is a CSS effect, not an icon.

---

## Font substitution note

The deck ships its own copy of **Inter** and **Inter Light** (Light is technically the same Inter binary the deck named differently — the system prefers using actual Inter weight 300 when available). Both ride in `fonts/`. If for any reason these need to be replaced with web‑hosted versions, [Google Fonts Inter](https://fonts.google.com/specimen/Inter) is a 1:1 match — flag the swap so the user can verify metrics.

---

## Quick‑start

```html
<link rel="stylesheet" href="colors_and_type.css">
<body class="mb-root mb-bg-aurora">
  <div class="mb-eyebrow">PRIVATE · CONFIDENTIAL · 2026</div>
  <h1 class="mb-hero">
    The AI‑Native<br>
    Growth Operating <em>System</em>.
  </h1>
  <p class="mb-body-light">
    The software‑driven operating system powering the future of digital growth.
  </p>
</body>
```

---

## Open questions for the user

1. **Logo** — the only logo asset in the deck is the small color mark (`assets/logo-moburst-color.png`, ~660×260). If you have a vector SVG version, the wordmark, or a monochrome lockup, please drop them into `assets/`.
2. **Photography library** — the deck uses 3D renders, not stock photos. If there's an approved render library or a Pinterest board of "look‑like‑this" references, link it.
3. **Body voice on non‑investor surfaces** — this system is tuned for the investor narrative. The public marketing voice on moburst.com may be a half‑shade warmer (more verbs, more "you"). Confirm whether that should be a separate sub‑system.
4. **gOS product UI** — no actual product screens were shared. If gOS has a real dashboard, the UI kit needs that source before it can model real product flows.
