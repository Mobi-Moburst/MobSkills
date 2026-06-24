---
name: moburst-deck-template
description: Re-skin existing slide decks (Google Slides, PPTX, Keynote) into Moburst-branded PPTX files that import cleanly into Google Slides. Every deck, slide, or presentation request produces a .pptx file built with pptxgenjs — never HTML. Use whenever the user mentions "redesign this deck", "re-skin", "make this on-brand", "Moburst deck", "investor deck", "apply our design system to these slides", or shares a Google Slides URL / PPTX upload and wants it on-brand.
targets: [claude, codex]
version: 1.0.0
visibility: internal
tags: [branding, design, presentations, pptx, deck]
owner: lital@moburst.com
---

**Output is always a .pptx file** in `/mnt/user-data/outputs/`. Every deck, slide, or presentation request produces a `.pptx` built with pptxgenjs that re-opens cleanly in Google Slides or PowerPoint. Never produce HTML — not as a deliverable, not even as an intermediate.

### What "re-skin" actually means

Two words drive the work: **preserve content, change chrome.**

- **Chrome** = backgrounds, color palette, typography, panel styling, decorative elements, layout grid, footer/eyebrow treatment, brand marks. A reskin changes all of this.
- **Content** = data, named entities (clients, partners, products), numbers, quotes, claims, structure, narrative beats, source citations, calls to action, commercial terms. A reskin preserves all of this verbatim.

The default impulse when redesigning is to also redesign content — and in doing so, content gets dropped or substituted without realizing it. These rules are non-negotiable unless the user explicitly authorizes the exception:

- Never substitute fabricated numbers for source data.
- Never anonymize named clients, partners, or products.
- Never drop pricing, deliverables, or commercial terms.
- Never drop transition slides as "decorative" — single-sentence transitions do structural work.
- Never re-author signed quotes (preserve attribution exactly).
- Never treat a "title-only" slide as empty when it has an embedded image — the image is the content.

If the rebuilt deck has fewer slides than the source, every dropped slide must be a deliberate, justified choice. Not a guess about what was decorative.

### Steps

1. **Audit the source deck — mandatory before any code.** Do a forced audit pass before opening pptxgenjs. Skipping this is the #1 cause of dropped content in a reskin.

   a. Convert source to PDF, render every page to JPEG, view all of them:
   ```bash
   python /mnt/skills/public/pptx/scripts/office/soffice.py --headless --convert-to pdf /path/to/source.pptx --outdir /home/claude/source
   pdftoppm -jpeg -r 80 /home/claude/source/source.pdf /home/claude/source/page
   ```
   b. Write a one-line note per slide.
   c. Tag each slide for things that must be preserved literally: embedded data viz (charts/tables/dashboards), named entities, pricing/commercial terms, single-sentence transition slides, signed quotes (with attribution), and any title-only-looking slide that has an embedded image (the image IS the content).
   d. Write a source-slide → my-slide build plan before touching pptxgenjs.
   e. **Extract the source images** to separate chrome from content. A PPTX is a zip:
   ```bash
   mkdir -p /home/claude/source/extract
   unzip -q /path/to/source.pptx -d /home/claude/source/extract
   # Count how many slides each image appears on:
   grep -rh 'Target=".*media' /home/claude/source/extract/ppt/slides/_rels/ \
     | sed -E 's/.*media\/([^"]+)".*/\1/' | sort | uniq -c | sort -rn
   ```
   Rule of thumb: images on **4+ slides** are almost certainly chrome (backgrounds, glows, repeated decorative). Images on **1–3 slides** are candidate content. Then **view every candidate-content image** before deciding to use it — some "unique" images are still decorative (gem heroes, phone mockups, abstract gradients, section-opener visuals). The threshold is heuristic, not deterministic. Visual confirmation per image is required.

2. **Read the source deck content.** Options in order of preference:
   - User uploaded a `.pptx` — extract with the public `pptx` skill (`/mnt/skills/public/pptx/SKILL.md`), pull slide text and structure.
   - User uploaded a `.pdf` export — use the public `pdf-reading` skill.
   - User pasted text — use it directly.
   - User shared a Google Slides URL — try `google_drive_fetch` first. **Note:** the Drive export-to-PPTX endpoint has a ~10 MB cap. Decks with embedded screenshots routinely exceed this — a 70-slide deck with platform UI shots is typically 30–60 MB. When the fetch fails, **don't keep retrying**. Ask the user to File → Download → Microsoft PowerPoint (.pptx) in Google Slides and upload the .pptx directly to the chat. Process locally; don't round-trip through Drive.

   Don't proceed without the actual content. Don't fabricate slides from the title alone.

3. **Map each source slide to a Moburst slide archetype.** The archetypes are defined in `pptx-builder.md`. Pick from: `cover`, `sectionOpener`, `sectionOpenerHero`, `bigStat`, `threeStat`, `quote`, `numberedGrid`, `comparisonTable`, `kpiRow`, `rankedList`, `caseStudyChapter`, `chartPanel`, `dashboardSnapshot`, `heatmapDashboard`, `breadcrumbSection`, `timeline`, `serviceStack`, `showcase`, `closingCTA`. If a source slide doesn't fit any archetype, pick the closest and adapt. Don't invent new archetypes mid-deck.

   **Rebuild native vs embed the source image** — for each slide that has a visual, decide which side to take:
   - Simple bar / line / donut charts with clear data → **rebuild native** in the Moburst palette, preserve the data points exactly.
   - Dense matrices, dashboard screenshots, platform UI mockups, complex proprietary visualizations → **embed the original image** (use `showcase` archetype). Rebuilding loses the substance.
   - Stylized callouts with 3–5 cards and a consistent layout → **rebuild native** to match the brand.
   - Author-illustrated diagrams (flywheels, custom flows) → judgement call. Rebuild if quick; embed if not.

4. **Read `pptx-builder.md` before writing any code.** It contains the brand tokens in pptxgenjs form, the helper functions (including the critical `autoFit`, `titleSizeForLength`, `fitImageToArea`, and the `PG()` page counter that's wired into every archetype's `pageNum` default), and one ready-to-use example per archetype. Copying from there is much cheaper than re-deriving the helpers each time.

5. **Build the deck.** One Node.js script. Use the bundled helpers from `pptx-builder.md`. Keep per-slide code short — if a slide takes more than ~60 lines of pptxgenjs, it's probably a custom layout that should be an archetype.

6. **QA before declaring done.** Convert to images with `soffice + pdftoppm` and view every slide. The single most common bug class is text overflow — numbers crashing through labels, italic-lime phrases wrapping mid-list, footers colliding with content. The v2 helpers fix the common cases via auto-sizing, but unusual content can still overflow. **For reskins, also render the source to JPEGs and side-by-side compare against the build** to catch dropped content, dropped attribution, or missing secondary callouts. **For any slide with embedded images, verify in actual PowerPoint or Google Slides at least once** — PDF previews silently mask image stretching bugs. Fix any defects with `breakAfter: true`, explicit `opts.fontSize`, or `fitImageToArea()` before shipping.

7. **Batch for large decks.** Decks over 30 slides should be built in batches of ~15. After each batch, write the .pptx to outputs, present it, then continue. The user can review early slides while later ones build. Never try to build 50+ slides in one tool turn.

### Authoring rules (the rules that prevent the most common defects)

1. **Never hard-code `fontSize` for variable text.** Numbers, KPI values, and titles must go through `autoFit()` or `titleSizeForLength()`. Only hard-code when you've manually verified the content length is fixed.

2. **Italic-lime title fragments have hard length limits.** The title pattern is `[plain prefix] + [italic accent] + [period]`. When the italic exceeds these limits the title wraps mid-italic and crashes through any lede beneath it:
   - **Italic accent phrase: ≤22 characters.** Tighten the phrase if it's longer.
   - **Total title: ≤40 characters at the default 36pt.** Beyond that, `titleSizeForLength` should drop aggressively (30pt at >50 chars, 26pt above that).
   - Recovery order when QA catches an overflow: (1) tighten the italic phrase → (2) tighten the plain prefix → (3) force a smaller `opts.fontSize` as a last resort. If you're reaching for option 3 often, the title pattern is being asked to do too much.
   - When the italic still has to be long, force the break: put `breakAfter: true` on the fragment *before* the italic group so the italic starts on a fresh line.
   ```js
   // BAD — italic wraps mid-phrase
   [{text:"Taking over "}, {text:"ChatGPT, Gemini, Perplexity, & Claude", italic:true}, {text:"."}]
   // GOOD — italic starts on its own line
   [{text:"Taking over", breakAfter:true}, {text:"ChatGPT, Gemini, Perplexity, & Claude", italic:true}, {text:"."}]
   ```

3. **Embedded images: hug the image, don't contain it.** Never use pptxgenjs `sizing: { type: "contain" }` — it has a silent bug where the .pptx renders with the image stretched to the explicit w×h in PowerPoint and Google Slides (LibreOffice respects the hint, so PDF previews mask it). Instead, read the source PNG's true pixel dimensions at build time and pass exact `w` and `h` to `addImage`. Use the `fitImageToArea()` helper in `pptx-builder.md`. For showcase slides, also size the *panel* to the image's aspect ratio + consistent padding — don't size the image to a fixed panel. The `showcase` archetype handles this automatically.

4. **Never use an empty dashboard panel as a placeholder.** If you don't have real data, either omit the slide or use `chartPanel` with illustrative data (and add an `ILLUSTRATIVE · NOT TO SCALE` source line). The v1 pattern of an empty panel with one centered text label looks broken on a real deliverable.

5. **Use the brand assets.** A 70-slide deck of solid-black `bg-aurora.jpg`-free slides looks generic. Aurora is the design-system default — `mk(slide)` applies it automatically. Drop `sectionOpenerHero` with `ROCKET` or `GEM` once or twice per major section. Use `timeline` for any "track record" / "phases" content, `serviceStack` for any "what we do" / "service vocabulary" content (it's the one place colored accent dots are allowed). The cinematic anchors are what make the deck feel like Moburst.

6. **Use `breadcrumbSection` for any multi-stage process.** The pill-row navigation pattern is the cleanest section-nav we have — pulling it out into an archetype makes a deck feel coherent across long process spans.

### Known PPTX limitations (accept these — don't fight them)

The Moburst HTML design system has features PPTX can't render. Drop or substitute:

- **SVG line charts with gradient strokes** → use pptxgenjs native `LINE` or `BAR` charts. Lose the gradient. Keep the lime stroke.
- **Backdrop blur / glass effects** → solid `#111114` fills with a 0.5pt lime stroke at 50% transparency. The blur is lost.
- **Outer glow on cards** → omit. The lime stroke alone reads as the keyline.
- **Italic-lime hinge inside a title** → pptxgenjs rich-text supports this and it renders in PowerPoint, but Google Slides sometimes flattens mixed runs on import. Use it anyway — most of the time it survives — but accept that some titles may import as single-color.
- **Inter typeface** → declare `fontFace: "Inter"` in pptxgenjs. PowerPoint will use it if installed; Google Slides will fall back to Arial.
- **CSS keyframe animations / GIF rotation** → static frame only. PPTX doesn't animate raster.

If a slide really needs an effect PPTX can't do, tell the user before building it — don't silently degrade.

### Footer stamp

Every slide ends with the Moburst footer: thin lime hairline at `y: 6.95`, logo at left, `Moburst · Strategic Briefing · YYYY` in `#9CA3AF`, page number on the right in lime. The exact code is in `pptx-builder.md` under `footer()`.

---

## What's in this skill

- `pptx-builder.md` — **the workhorse.** Brand tokens in pptxgenjs form, helper functions (`autoFit`, `titleSizeForLength`, `footer`, `eyebrow`, `title`, `lede`, `card`, `kpiRow`, `rankedList`, `numberedGrid`, `breadcrumbPills`, `dashFrame`), and one example per slide archetype. Read this first, before writing any code.
- `README.md` — content fundamentals (voice, casing, periods, vocabulary) and brand visual foundations (color, type, backgrounds, hero objects, iconography). Read for any non-trivial brand decision.
- `assets/` — **`logo-moburst-lockup-white.png` (the full lockup — wordmark + M-prism, white wordmark for dark canvases)**, aurora bg, starfield, rocket, gem, services loop, horizon chart. Use rasters directly in PPTX; don't redraw as SVG. The lockup aspect ratio is 2.8:1 — size at `w × w/2.8` to avoid distortion.
- `fonts/` — Inter Regular/Bold/Italic + Inter Light TTFs.
- `slides/index.html` + `preview/` — HTML specimens of the Moburst look, kept only as a visual reference for what the PPTX build is targeting (not an output path).

## The 90-second briefing

- **One accent color only**: `--mb-lime` (`#B9E045`). All text is pure white (`#FFFFFF`) or lime — never grey. Grey is reserved for non-text surfaces and hairlines only (card fills, panel lines).
- **Inter 700** for everything that matters. Inter Light 300 for body that needs air. No serif, no display family, no mono.
- **Hard periods.** Display titles end with `.` even when sentence-cased. One italic-lime phrase per title — the conceptual hinge ("13 years of disciplined *evolution*.").
- **No glow, no drop shadow.** PPTX renders neither — the lime keyline carries the emphasis.
- **No emoji. No pictograms.** Numbers (`01`, `02`…), middle dots (`·`), arrows (`→`), multiply sign (`×`) carry the iconographic load.
- **Tone**: institutional, operator-confident, financially literate. Lean toward *moat, run-rate, inflection, mix, multiple*; away from *journey, magical, unleash*.

If about to deviate from any of these, stop and confirm with the user first.
