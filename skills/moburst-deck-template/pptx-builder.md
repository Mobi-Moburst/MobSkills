# pptx-builder.md — Moburst PPTX construction reference

Read this file at the start of any Mode A (deck redesign → PPTX) task. It contains everything needed to emit Moburst-branded `.pptx` with `pptxgenjs`, so individual slide builds stay short.

> **What changed in v2 (Nov 2026):** Big-number overlaps in `bigStat` and `kpiRow` are fixed via real auto-sizing. The `cover` and `sectionOpener` archetypes pick a font size from title length. New archetypes added for hero-image slides, breadcrumb-nav section headers, and dashboards with real charts. Old function signatures still work — passing `{fontSize: N}` overrides the auto-size.
>
> **What changed in v3 (2026 reskin learnings):** New `showcase` archetype for embedding source images at correct aspect ratio. New `fitImageToArea()` / `panelForImage()` / `getPngDimensions()` helpers — use these instead of pptxgenjs `sizing: { type: "contain" }`, which is silently broken in PowerPoint/Slides (renders fine in LibreOffice PDF previews, stretches in actual PowerPoint). New `PG()` page counter is wired in as every archetype's trailing optional `pageNum = PG()` parameter — call sites just omit the page number entirely (`bigStat("5x", labelFrags, "Source")`) and page order tracks the build. Tightened title length rules: italic accent ≤22 chars, total title ≤40 chars at 36pt. QA loop now requires actual-PowerPoint check for any slide with embedded images, and side-by-side comparison against source for reskins.

## Setup

```bash
mkdir -p /home/claude/deck/assets
# Always copy the full lockup logo — every slide footer + cover uses it
cp /mnt/skills/user/moburst-deck-template/assets/logo-moburst-lockup-white.png /home/claude/deck/assets/
# Backgrounds — copy when used
cp /mnt/skills/user/moburst-deck-template/assets/bg-aurora.jpg /home/claude/deck/assets/
cp /mnt/skills/user/moburst-deck-template/assets/bg-starfield.png /home/claude/deck/assets/
# Hero objects — copy what the deck needs
cp /mnt/skills/user/moburst-deck-template/assets/img-rocket.png /home/claude/deck/assets/
cp /mnt/skills/user/moburst-deck-template/assets/img-gem-green.png /home/claude/deck/assets/
cp /mnt/skills/user/moburst-deck-template/assets/img-services-loop.png /home/claude/deck/assets/
cp /mnt/skills/user/moburst-deck-template/assets/img-horizon-chart.png /home/claude/deck/assets/
cd /home/claude/deck && npm install pptxgenjs --silent
```

Output the final file to `/mnt/user-data/outputs/<deck-name>.pptx`, then `present_files`.

## Boilerplate — copy verbatim into the top of every build script

```javascript
const pptxgen = require("pptxgenjs");

const pres = new pptxgen();
pres.layout = "LAYOUT_WIDE";    // 13.33" x 7.5"
pres.author = "Moburst";
pres.company = "Moburst";
pres.title = "<deck title here>";

const W = 13.33, H = 7.5;
const LOGO     = "/home/claude/deck/assets/logo-moburst-lockup-white.png";
// Lockup aspect ratio is 2.8:1 (1191 × 426 px). Use w × w/2.8 when sizing.
const AURORA   = "/home/claude/deck/assets/bg-aurora.jpg";
const STARFIELD= "/home/claude/deck/assets/bg-starfield.png";
const ROCKET   = "/home/claude/deck/assets/img-rocket.png";
const GEM      = "/home/claude/deck/assets/img-gem-green.png";
const SERVICES = "/home/claude/deck/assets/img-services-loop.png";
const HORIZON  = "/home/claude/deck/assets/img-horizon-chart.png";

// Brand palette — these are the only colors allowed
const C = {
  bg: "0A0A0A",        // canvas
  black: "000000",
  lime: "B9E045",      // the one accent
  limeDim: "8AA833",
  white: "FFFFFF",
  text: "FFFFFF",      // body copy — pure white
  muted: "FFFFFF",     // secondary text — pure white (brand call: no grey text anywhere)
  mutedDim: "FFFFFF",  // footnotes / legal — pure white too
  card: "111114",      // card fill, near canvas
  panelDark: "0F1216",
  panelLine: "1F2937", // hairline grid (NON-text — stays for rules/dividers)
  redDim: "B45B5B",    // only for negative deltas
};

// Fonts — Inter is the brand. Aptos is the modern fallback that's pre-installed
// on most Windows/Mac systems and survives Google Slides import gracefully.
const F = {
  display: "Inter",  // declare Inter; Slides will fall back to Arial. Optionally use "Aptos Display".
  body: "Inter",     // or "Aptos"
};

// Page counter — avoids hard-coded page numbers that need updating every time
// you insert, reorder, or delete a slide during iteration.
//
// All archetype functions have `pageNum = PG()` as their TRAILING optional
// parameter, so the idiomatic call is just `bigStat("5x", labelFrags, ...)` /
// `quote("EYEBROW", quoteFrags, attribution)` / `showcase("EYEBROW", titleFrags,
// imagePath)` — no page number at all. Page numbers track build order
// automatically. The cover does the same via `opts.pageNum ?? PG()`, so calling
// it first makes it slide 1.
//
// To force a specific page number, pass it as the last argument:
//   bigStat("5x", labelFrags, sourceText, "THE PROOF", 7);
//
// For inline-built (non-factory) slide blocks, capture once at the top:
//   const pg = PG();
//   ... build slide ...
//   footer(s, pg);   // pass `pg`, not `PG()` again — that double-increments.
//
// Don't mix explicit numbers and defaults in the same deck — the counter will
// drift out of sync with the explicit values.
let _pg = 0;
const PG = () => ++_pg;
```

## The auto-sizer — paste this once, use it everywhere

Big-number and big-title overflow are the #1 defect class in this skill. Use the auto-sizer instead of hard-coding `fontSize` for any text that varies in length.

```javascript
// Pick a font size that will fit `text` in a box of `widthInches` at Inter Bold.
// Calibrated empirically against pptxgenjs Inter Bold rendering at LAYOUT_WIDE.
// • Numerals/symbols (digits, %, +, -, ×, ~, $) avg advance ≈ 0.75 × fontSize
// • Mixed letters avg advance ≈ 0.80 × fontSize
// Safety factor 0.85 leaves margin for kerning, % and × glyphs (which run wide),
// and pptxgenjs internal text-box padding.
// Returns an integer pt size clamped to [minPt, maxPt].
function autoFit(text, widthInches, maxPt = 280, minPt = 16) {
  const hasLetters = /[A-Za-z]/.test(text);
  const ratio = hasLetters ? 0.80 : 0.75;
  const fitted = Math.floor((widthInches * 72 * 0.85) / (text.length * ratio));
  return Math.max(minPt, Math.min(maxPt, fitted));
}

// Pick a TITLE font size from total character count. Use when the title is
// 1-2 lines and you want it to look proportional across short and long titles.
function titleSizeForLength(totalChars, opts = {}) {
  const ceiling = opts.max || 56;
  const floor = opts.min || 26;
  if (totalChars <= 20) return Math.min(ceiling, 64);
  if (totalChars <= 35) return Math.min(ceiling, 54);
  if (totalChars <= 55) return Math.min(ceiling, 44);
  if (totalChars <= 75) return Math.min(ceiling, 36);
  if (totalChars <= 100) return Math.min(ceiling, 30);
  return floor;
}

// Sum the .text length of a fragments array.
function fragLen(fragments) {
  return fragments.reduce((sum, f) => sum + f.text.length, 0);
}

// ─── Image sizing — CRITICAL ─────────────────────────────────────────────────
//
// pptxgenjs `sizing: { type: "contain" }` does NOT preserve aspect ratio in
// PowerPoint or Google Slides — the image is stretched to the explicit w × h
// and text inside screenshots becomes horizontally smeared. The bug is silent
// in LibreOffice/PDF previews, so QA via soffice --convert-to pdf will NOT
// catch it. The damage only shows in the actual PowerPoint/Slides renderer.
//
// FIX: read the source PNG's pixel dimensions, compute the largest w × h that
// fits the available area at the true aspect ratio, pass those exact values
// to addImage. Never use the `sizing` option at all.
// ──────────────────────────────────────────────────────────────────────────────

const fs = require("fs");

// Read a PNG file's pixel dimensions from its IHDR header.
// PNG signature is 8 bytes; IHDR starts at byte 8 with 4 bytes of length,
// 4 bytes of chunk type ("IHDR"), then width (4 bytes big-endian uint32 at
// offset 16) and height (4 bytes big-endian uint32 at offset 20).
// Returns {w, h} in pixels.
function getPngDimensions(path) {
  const fd = fs.openSync(path, "r");
  const buf = Buffer.alloc(24);
  fs.readSync(fd, buf, 0, 24, 0);
  fs.closeSync(fd);
  if (buf.toString("ascii", 1, 4) !== "PNG") {
    throw new Error(`Not a PNG: ${path}`);
  }
  return {
    w: buf.readUInt32BE(16),
    h: buf.readUInt32BE(20),
  };
}

// Compute the largest w × h (in inches) that fits inside `areaW × areaH`
// at the image's native aspect ratio. Returns the addImage params object
// with `x, y, w, h` centered inside the area.
//   const img = fitImageToArea("/path/to/shot.png", 1.0, 1.5, 6.0, 4.5);
//   slide.addImage({ path: img.path, ...img });
function fitImageToArea(path, areaX, areaY, areaW, areaH) {
  const { w: pxW, h: pxH } = getPngDimensions(path);
  const imgAspect = pxW / pxH;
  const areaAspect = areaW / areaH;
  let w, h;
  if (imgAspect > areaAspect) {
    // Image is wider than the area — fit to width, center vertically
    w = areaW;
    h = areaW / imgAspect;
  } else {
    // Image is taller — fit to height, center horizontally
    h = areaH;
    w = areaH * imgAspect;
  }
  return {
    path,
    x: areaX + (areaW - w) / 2,
    y: areaY + (areaH - h) / 2,
    w,
    h,
  };
}

// Compute a panel size that hugs an image at its native aspect + consistent
// padding (default 0.25"). Use when the slide is a single-image showcase and
// you want the panel to fit the image instead of forcing the image into a
// fixed panel. Returns {panelX, panelY, panelW, panelH, imgX, imgY, imgW, imgH}.
//   const p = panelForImage("/path/to/shot.png", maxPanelW, maxPanelH, 0.25);
//   card(slide, p.panelX_centered_at(W/2), p.panelY, p.panelW, p.panelH);
function panelForImage(path, maxPanelW, maxPanelH, pad = 0.25) {
  const { w: pxW, h: pxH } = getPngDimensions(path);
  const imgAspect = pxW / pxH;
  const maxImgW = maxPanelW - 2 * pad;
  const maxImgH = maxPanelH - 2 * pad;
  let imgW, imgH;
  if (maxImgW / maxImgH > imgAspect) {
    // Constrained by height
    imgH = maxImgH;
    imgW = imgH * imgAspect;
  } else {
    // Constrained by width
    imgW = maxImgW;
    imgH = imgW / imgAspect;
  }
  return {
    panelW: imgW + 2 * pad,
    panelH: imgH + 2 * pad,
    imgW,
    imgH,
    pad,
  };
}
```

## Helper functions — paste these once, reuse on every slide

```javascript
function mk(slide, bg = "aurora") {
  // Aurora is the design-system default per README. Pass bg="solid" for plain
  // black (e.g. when the slide has its own dense visual content competing for
  // attention), bg="starfield" for the cinematic hero treatment (rocket etc).
  if (bg === "aurora") {
    slide.addImage({ path: AURORA, x: 0, y: 0, w: W, h: H });
  } else if (bg === "starfield") {
    slide.addImage({ path: STARFIELD, x: 0, y: 0, w: W, h: H });
  } else {
    slide.background = { color: C.bg };
  }
  return slide;
}

// Footer stamp — every slide gets this. Uses the FULL LOCKUP logo (moburst
// wordmark + M-prism). The footer text drops the "Moburst" prefix since the
// lockup already shows it.
function footer(slide, pageNum, year = 2026) {
  slide.addShape(pres.shapes.LINE, {
    x: 0.6, y: 6.95, w: W - 1.2, h: 0,
    line: { color: C.panelLine, width: 0.5 },
  });
  // Lockup: 1.0" wide × 0.357" tall (2.8:1 aspect ratio)
  slide.addImage({ path: LOGO, x: 0.6, y: 7.07, w: 1.0, h: 0.357 });
  slide.addText(`Strategic Briefing  ·  ${year}`, {
    x: 1.75, y: 7.05, w: 6, h: 0.4,
    fontFace: F.body, fontSize: 9, color: C.muted,
    valign: "middle", margin: 0, charSpacing: 1.5,
  });
  slide.addText(String(pageNum).padStart(2, "0"), {
    x: W - 1.2, y: 7.05, w: 0.6, h: 0.4,
    fontFace: F.body, fontSize: 9, color: C.lime,
    align: "right", valign: "middle", margin: 0, charSpacing: 1.5,
  });
}

// Eyebrow — small uppercase lime tag, letter-spaced
function eyebrow(slide, text, x, y, w = 9) {
  slide.addText(String(text).toUpperCase(), {
    x, y, w, h: 0.3,
    fontFace: F.body, fontSize: 10, color: C.lime, bold: true,
    charSpacing: 4, valign: "middle", margin: 0,
  });
}

// Title with italic-lime hinge. Pass fragments: [{text, italic?, breakAfter?}]
// IMPORTANT: pass an `opts.fontSize` only when you've manually verified it fits.
// Otherwise pass `opts.autoFit: true` and the function picks the size from char count.
function title(slide, fragments, x, y, w, h, opts = {}) {
  const rich = fragments.map(f => ({
    text: f.text,
    options: {
      italic: !!f.italic,
      color: f.italic ? C.lime : C.white,
      bold: !f.italic,
      breakLine: !!f.breakAfter,
    },
  }));
  const size = opts.fontSize
    || (opts.autoFit ? titleSizeForLength(fragLen(fragments), opts) : 44);
  slide.addText(rich, {
    x, y, w, h,
    fontFace: F.display, fontSize: size,
    bold: true, valign: "top", margin: 0, charSpacing: -0.5,
  });
}

// Lede — primary body copy under a title. White for readability on the dark
// canvas; 15pt default (bumped from the old 13pt grey, which read too small).
function lede(slide, text, x, y, w, h, opts = {}) {
  slide.addText(text, {
    x, y, w, h,
    fontFace: F.body, fontSize: opts.fontSize || 15, color: C.white,
    valign: "top", margin: 0, paraSpaceAfter: 4,
  });
}

// Card — rounded rect with lime keyline. The Moburst signature surface.
function card(slide, x, y, w, h, opts = {}) {
  slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x, y, w, h, rectRadius: 0.12,
    fill: { color: opts.fill || C.card },
    line: { color: opts.line || C.lime, width: 0.5, transparency: opts.lineTrans ?? 55 },
  });
}

// KPI tile row — items: [{label, value, delta, highlight?}]
// REVISED v2: value auto-sizes to fit the tile width (was a fixed-threshold bug).
function kpiRow(slide, items, x, y, w, h) {
  const gap = 0.15;
  const tileW = (w - gap * (items.length - 1)) / items.length;
  const valueBoxW = tileW - 0.36;  // padding inside tile
  items.forEach((it, i) => {
    const tx = x + i * (tileW + gap);
    const fill = it.highlight ? C.lime : C.card;
    const labelC = it.highlight ? "0A0A0A" : C.muted;
    const valueC = it.highlight ? "0A0A0A" : C.white;
    slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x: tx, y, w: tileW, h, rectRadius: 0.10,
      fill: { color: fill },
      line: { color: C.lime, width: 0.5, transparency: it.highlight ? 0 : 65 },
    });
    slide.addText(it.label.toUpperCase(), {
      x: tx + 0.18, y: y + 0.12, w: valueBoxW, h: 0.25,
      fontFace: F.body, fontSize: 8.5, color: labelC, bold: true,
      charSpacing: 2.5, valign: "middle", margin: 0,
    });
    // AUTO-SIZE the value so "+58%" never wraps to two lines inside a 2.5"-3.5" tile.
    // Cap at 44pt (visual ceiling) and floor at 18pt (still legible).
    const valueSize = Math.min(44, autoFit(it.value, valueBoxW, 44, 18));
    slide.addText(it.value, {
      x: tx + 0.18, y: y + 0.42, w: valueBoxW, h: h - 0.78,
      fontFace: F.display, fontSize: valueSize,
      bold: true, color: valueC, valign: "middle", margin: 0, charSpacing: -1,
    });
    if (it.delta) {
      slide.addText(it.delta, {
        x: tx + 0.18, y: y + h - 0.32, w: valueBoxW, h: 0.24,
        fontFace: F.body, fontSize: 9, color: it.highlight ? "1A1A1A" : C.muted,
        valign: "middle", margin: 0,
      });
    }
  });
}

// Numbered card grid — items: [{num, head, desc, hot?}]
function numberedGrid(slide, items, x, y, w, h, cols) {
  const gap = 0.18;
  const rows = Math.ceil(items.length / cols);
  const cellW = (w - gap * (cols - 1)) / cols;
  const cellH = (h - gap * (rows - 1)) / rows;
  items.forEach((it, i) => {
    const r = Math.floor(i / cols), c = i % cols;
    const cx = x + c * (cellW + gap);
    const cy = y + r * (cellH + gap);
    const hot = !!it.hot;
    slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x: cx, y: cy, w: cellW, h: cellH, rectRadius: 0.10,
      fill: { color: hot ? C.lime : C.card },
      line: { color: C.lime, width: 0.5, transparency: hot ? 0 : 60 },
    });
    if (it.num) {
      slide.addText(it.num, {
        x: cx + 0.18, y: cy + 0.12, w: cellW - 0.36, h: 0.28,
        fontFace: F.body, fontSize: 9, color: hot ? "0A0A0A" : C.lime, bold: true,
        charSpacing: 2.5, valign: "middle", margin: 0,
      });
    }
    if (it.head) {
      slide.addText(it.head, {
        x: cx + 0.18, y: cy + 0.40, w: cellW - 0.36, h: 0.5,
        fontFace: F.display, fontSize: 14, color: hot ? "0A0A0A" : C.white,
        bold: true, valign: "top", margin: 0,
      });
    }
    if (it.desc) {
      slide.addText(it.desc, {
        x: cx + 0.18, y: cy + 0.95, w: cellW - 0.36, h: cellH - 1.1,
        fontFace: F.body, fontSize: 10, color: hot ? "1A1A1A" : C.white,
        valign: "top", margin: 0,
      });
    }
  });
}

// Ranked-list bar rows — items: [{rank, name, pct, barPct}]
function rankedList(slide, items, x, y, w, rowH) {
  items.forEach((it, i) => {
    const ry = y + i * rowH;
    slide.addText(it.rank, {
      x: x + 0.1, y: ry, w: 0.45, h: rowH,
      fontFace: F.body, fontSize: 10, color: C.muted, bold: true,
      align: "center", valign: "middle", margin: 0, charSpacing: 1.5,
    });
    slide.addText(it.name, {
      x: x + 0.6, y: ry, w: w * 0.42, h: rowH,
      fontFace: F.body, fontSize: 11, color: C.white,
      valign: "middle", margin: 0,
    });
    const barX = x + w * 0.48;
    const barW = w * 0.42;
    slide.addShape(pres.shapes.RECTANGLE, {
      x: barX, y: ry + rowH * 0.35, w: barW, h: rowH * 0.30,
      fill: { color: C.panelLine }, line: { color: C.panelLine, width: 0 },
    });
    slide.addShape(pres.shapes.RECTANGLE, {
      x: barX, y: ry + rowH * 0.35, w: barW * (it.barPct / 100), h: rowH * 0.30,
      fill: { color: C.lime }, line: { color: C.lime, width: 0 },
    });
    slide.addText(it.pct, {
      x: x + w - 0.7, y: ry, w: 0.6, h: rowH,
      fontFace: F.body, fontSize: 10, color: C.lime, bold: true,
      align: "right", valign: "middle", margin: 0,
    });
  });
}

// Breadcrumb pill row — items: array of strings. activeIdx: 0-based index of the hot pill.
// Pattern is from `slide 70` of the source deck — the cleanest section-nav we have.
function breadcrumbPills(slide, items, activeIdx, x, y, w, h = 0.5) {
  const gap = 0.12;
  const pillW = (w - gap * (items.length - 1)) / items.length;
  items.forEach((label, i) => {
    const px = x + i * (pillW + gap);
    const isActive = i === activeIdx;
    slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x: px, y, w: pillW, h, rectRadius: h / 2,
      fill: { color: isActive ? C.lime : C.bg },
      line: { color: C.lime, width: 0.75, transparency: isActive ? 0 : 60 },
    });
    slide.addText(label, {
      x: px, y, w: pillW, h,
      fontFace: F.body, fontSize: 10,
      color: isActive ? "0A0A0A" : C.white,
      bold: true, align: "center", valign: "middle",
      margin: 0, charSpacing: 0.5,
    });
  });
}

// Dashboard panel frame — bracket corners only (no fill), 12.1" × 4.0"
// Used by chartPanel and dashboardHeatmap. Use it directly when you need
// just the frame and you're filling it with custom shapes.
function dashFrame(slide, x, y, w, h) {
  slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x, y, w, h, rectRadius: 0.10,
    fill: { color: C.panelDark },
    line: { color: C.panelLine, width: 0.5 },
  });
  // Lime corner brackets — top-left, bottom-right
  const cornerLen = 0.3;
  slide.addShape(pres.shapes.LINE, { x: x + 0.18, y: y + 0.18, w: cornerLen, h: 0,
    line: { color: C.lime, width: 1.5 } });
  slide.addShape(pres.shapes.LINE, { x: x + 0.18, y: y + 0.18, w: 0, h: cornerLen,
    line: { color: C.lime, width: 1.5 } });
  slide.addShape(pres.shapes.LINE, { x: x + w - 0.18 - cornerLen, y: y + h - 0.18, w: cornerLen, h: 0,
    line: { color: C.lime, width: 1.5 } });
  slide.addShape(pres.shapes.LINE, { x: x + w - 0.18, y: y + h - 0.18 - cornerLen, w: 0, h: cornerLen,
    line: { color: C.lime, width: 1.5 } });
}
```

## Slide archetypes — one example per type, ready to adapt

The deck of any redesign maps to combinations of these. If a source slide doesn't fit, pick the closest.

### Cover (v2 — title auto-sizes)

```javascript
function cover(deckTitle, fragments, opts = {}) {
  // opts: { aurora: bool, eyebrow: string, heroImg: string, pageNum: number }
  // pageNum defaults to PG() so the cover auto-becomes slide 1 when called first.
  const s = mk(pres.addSlide(), opts.aurora ? "aurora" : null);

  // Full lockup at top-left — 1.7" wide × 0.607" tall (2.8:1 aspect)
  // No separate "MOBURST" text — the wordmark is part of the lockup.
  s.addImage({ path: LOGO, x: 0.6, y: 0.5, w: 1.7, h: 0.607 });

  // Eyebrow, top-right (w=4.0 fits "STRATEGIC BRIEFING · 2026" on one line)
  eyebrow(s, opts.eyebrow || "STRATEGIC BRIEFING  ·  2026", W - 4.5, 0.65, 4.0);

  // Optional hero on the right half (rocket image, etc.)
  const titleW = opts.heroImg ? 7.0 : 12.1;
  if (opts.heroImg) {
    s.addImage({ path: opts.heroImg, x: 7.0, y: 0, w: 6.33, h: H });
  }

  // Title sized by total length — long titles get smaller automatically.
  const len = fragLen(fragments);
  const sz = opts.fontSize || titleSizeForLength(len, { max: 64 });
  title(s, fragments, 0.6, 2.2, titleW, 4.0, { fontSize: sz });

  // Accent line — positioned below the title block, scaled to title size
  // so it never collides with a wrapping title.
  const lineY = sz >= 54 ? 6.2 : sz >= 40 ? 6.0 : 5.7;
  s.addShape(pres.shapes.LINE, { x: 0.6, y: lineY, w: 4, h: 0,
    line: { color: C.lime, width: 1 } });

  footer(s, opts.pageNum ?? PG());
}
// Examples:
// cover("Winning visibility", [
//   {text:"Winning visibility in the "},
//   {text:"age of AI", italic:true, breakAfter:true},
//   {text:"—how Moburst makes your brand "},
//   {text:"impossible to ignore", italic:true}, {text:"."},
// ], { aurora: true });
//
// cover("Series B", [
//   {text:"The infrastructure is "}, {text:"built", italic:true}, {text:"."}
// ], { aurora: true, heroImg: ROCKET });
```

### Section opener (v2 — autoFit defaulted on)

```javascript
function sectionOpener(eyebrowText, titleFrags, ledeText, opts = {}, pageNum = PG()) {
  const s = mk(pres.addSlide(), opts.bg || null);
  eyebrow(s, eyebrowText, 0.6, 0.6, 10);
  // Auto-sized title — long phrases never overflow.
  const sz = opts.fontSize || titleSizeForLength(fragLen(titleFrags), { max: 54 });
  title(s, titleFrags, 0.6, 1.1, 12.1, 3.0, { fontSize: sz });
  if (ledeText) lede(s, ledeText, 0.6, sz >= 50 ? 4.0 : 3.7, 11.5, 1.5, { fontSize: 15 });
  footer(s, pageNum);
}
```

### Section opener with hero object (NEW — rocket / gem on the right)

```javascript
function sectionOpenerHero(eyebrowText, titleFrags, ledeText, heroImg, opts = {}, pageNum = PG()) {
  // heroImg: ROCKET | GEM | SERVICES. opts.bg: "starfield" recommended for ROCKET.
  const s = mk(pres.addSlide(), opts.bg || "starfield");
  eyebrow(s, eyebrowText, 0.6, 0.6, 8);
  // Title constrained to left half so it doesn't overlap the hero
  const sz = opts.fontSize || titleSizeForLength(fragLen(titleFrags), { max: 48 });
  title(s, titleFrags, 0.6, 1.4, 6.5, 3.8, { fontSize: sz });
  if (ledeText) lede(s, ledeText, 0.6, 5.4, 6.5, 1.3, { fontSize: 15 });
  // Hero image on the right — full height, 60% width
  s.addImage({ path: heroImg, x: 7.2, y: 0.3, w: 6.0, h: 6.4, sizing: { type: "contain", w: 6.0, h: 6.4 } });
  footer(s, pageNum);
}
```

### Big stat (v2 — number auto-sizes, label always clears)

```javascript
function bigStat(number, labelFrags, sourceText, eyebrowText = "THE PROOF", pageNum = PG()) {
  const s = mk(pres.addSlide());
  eyebrow(s, eyebrowText, 0.6, 0.6, 8);

  // Number sized to fit 11" with a 220pt ceiling. This is the single most
  // important fix — the v1 default of 280pt overlapped the label below it.
  const numSize = Math.min(220, autoFit(number, 11.0, 220, 80));
  s.addText(number, {
    x: 0.6, y: 1.2, w: 12.1, h: 3.2,
    fontFace: F.display, fontSize: numSize, color: C.lime, bold: true,
    align: "left", valign: "top", margin: 0, charSpacing: -4,
  });

  // Label sits at y=4.85 — well below the number block at any size up to 220pt.
  // Auto-sized too so long labels don't crash into the source line.
  const labelSize = titleSizeForLength(fragLen(labelFrags), { max: 30, min: 18 });
  title(s, labelFrags, 0.6, 4.85, 12.1, 1.3, { fontSize: labelSize });

  if (sourceText) {
    s.addText(sourceText.toUpperCase(), {
      x: 0.6, y: 6.5, w: 12, h: 0.2,
      fontFace: F.body, fontSize: 8, color: C.mutedDim,
      charSpacing: 2, valign: "middle", margin: 0,
    });
  }
  footer(s, pageNum);
}
```

### Three-stat row (kpiRow-based, v2)

```javascript
function threeStat(eyebrowText, titleFrags, stats, pageNum = PG()) {
  // stats: [{num, label, src}]  — `num` auto-sizes per card
  const s = mk(pres.addSlide());
  eyebrow(s, eyebrowText, 0.6, 0.6, 8);
  const titleSize = titleSizeForLength(fragLen(titleFrags), { max: 40 });
  title(s, titleFrags, 0.6, 1.0, 12.1, 1.2, { fontSize: titleSize });
  const cardW = 3.95, gap = 0.18;
  const numBoxW = cardW - 0.6;
  stats.forEach((st, i) => {
    const cx = 0.6 + i * (cardW + gap);
    card(s, cx, 2.6, cardW, 4.0);
    // AUTO-SIZE the stat number so "+58%" / "−50%" / "~33%" fit on one line
    const sz = Math.min(84, autoFit(st.num, numBoxW, 84, 32));
    s.addText(st.num, {
      x: cx + 0.3, y: 2.8, w: numBoxW, h: 1.5,
      fontFace: F.display, fontSize: sz, color: C.lime, bold: true,
      valign: "top", margin: 0, charSpacing: -2,
    });
    s.addText(st.label, {
      x: cx + 0.3, y: 4.5, w: numBoxW, h: 1.6,
      fontFace: F.body, fontSize: 13, color: C.white, valign: "top", margin: 0,
    });
    if (st.src) s.addText(st.src, {
      x: cx + 0.3, y: 6.25, w: numBoxW, h: 0.3,
      fontFace: F.body, fontSize: 8, color: C.muted, italic: true,
      valign: "middle", margin: 0, charSpacing: 1,
    });
  });
  footer(s, pageNum);
}
```

### Quote

```javascript
function quote(eyebrowText, quoteFrags, attribution, pageNum = PG()) {
  const s = mk(pres.addSlide());
  eyebrow(s, eyebrowText, 0.6, 0.6, 8);
  card(s, 0.6, 1.4, 12.1, 5.0);
  s.addText("\u201C", { x: 0.9, y: 1.4, w: 1.5, h: 1.6,
    fontFace: F.display, fontSize: 120, color: C.lime, bold: true,
    valign: "top", margin: 0 });
  const rich = quoteFrags.map(f => ({
    text: f.text,
    options: { color: f.italic ? C.lime : C.white, italic: !!f.italic },
  }));
  s.addText(rich, { x: 2.4, y: 1.8, w: 10.0, h: 3.5,
    fontFace: F.display, fontSize: 26, valign: "top", margin: 0 });
  s.addText(attribution.toUpperCase(), { x: 2.4, y: 5.5, w: 10, h: 0.4,
    fontFace: F.body, fontSize: 10, color: C.lime, bold: true,
    charSpacing: 3, valign: "middle", margin: 0 });
  footer(s, pageNum);
}
```

### Case study chapter opener (v2 — number and title no longer overlap)

```javascript
function caseStudyChapter(eyebrowText, chapterNum, titleFrags, leadFrags, pageNum = PG()) {
  // v1 bug: number at y=0.5 collided with title at y=2.6. v2: number in a 1.6"
  // band at y=1.0, title at y=3.2, optional lead card at y=4.8.
  const s = mk(pres.addSlide());
  eyebrow(s, eyebrowText, 0.6, 0.6, 8);
  s.addText(chapterNum, {
    x: 0.6, y: 1.0, w: 4.0, h: 1.6,
    fontFace: F.display, fontSize: 120, color: C.lime, bold: true,
    align: "left", valign: "top", margin: 0, charSpacing: -4,
  });
  const sz = titleSizeForLength(fragLen(titleFrags), { max: 56 });
  title(s, titleFrags, 0.6, 3.2, 12.1, 1.6, { fontSize: sz });
  if (leadFrags) {
    card(s, 0.6, 4.8, 12.1, 1.6);
    const leadSize = titleSizeForLength(fragLen(leadFrags), { max: 22, min: 14 });
    title(s, leadFrags, 0.85, 5.0, 11.6, 1.2, { fontSize: leadSize });
  }
  footer(s, pageNum);
}
```

### Comparison table (SEO vs AEO, before/after, etc.)

```javascript
function comparisonTable(eyebrowText, titleFrags, rows, pageNum = PG()) {
  // rows[0] is the header. rows[i][0] is the row label, [1] left col, [2] right col.
  const s = mk(pres.addSlide());
  eyebrow(s, eyebrowText, 0.6, 0.6, 8);
  const sz = titleSizeForLength(fragLen(titleFrags), { max: 38 });
  title(s, titleFrags, 0.6, 1.0, 12.1, 1.2, { fontSize: sz });
  const styled = rows.map((row, i) => {
    if (i === 0) {
      return row.map((cell, c) => ({
        text: cell,
        options: { bold: true, color: c === 0 ? C.lime : (c === 2 ? C.lime : C.white),
          fontFace: F.body, fontSize: 10,
          fill: { color: C.card }, valign: "middle", charSpacing: 2 },
      }));
    }
    return row.map((cell, c) => ({
      text: cell,
      options: { fontFace: F.body, fontSize: 11,
        color: c === 0 ? C.muted : (c === 2 ? C.lime : C.white),
        bold: c === 0, valign: "middle",
        fill: { color: i % 2 === 0 ? C.bg : C.panelDark }, margin: 0.08 },
    }));
  });
  s.addTable(styled, {
    x: 0.6, y: 2.4, w: 12.1, h: 4.3,
    colW: [2.4, 4.5, 5.2],
    border: { type: "solid", pt: 0.5, color: C.panelLine },
  });
  footer(s, pageNum);
}
```

### Chart panel (real chart — line or bar)

```javascript
function chartPanel(eyebrowText, titleFrags, ledeText, chartConfig, pageNum = PG()) {
  const s = mk(pres.addSlide());
  eyebrow(s, eyebrowText, 0.6, 0.6, 8);
  const sz = titleSizeForLength(fragLen(titleFrags), { max: 30 });
  title(s, titleFrags, 0.6, 1.0, 12.1, 1.0, { fontSize: sz });
  if (ledeText) lede(s, ledeText, 0.6, 2.0, 12, 0.5, { fontSize: 14 });
  // Panel
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x: 0.6, y: 2.7, w: 12.1, h: 4.0, rectRadius: 0.10,
    fill: { color: C.panelDark }, line: { color: C.panelLine, width: 0.5 },
  });
  s.addChart(chartConfig.type, chartConfig.data, {
    x: 0.9, y: 3.0, w: 11.5, h: 3.5,
    chartColors: ["B9E045", "8AA833", "9CA3AF"],
    chartArea: { fill: { color: C.panelDark } },
    plotArea: { fill: { color: C.panelDark } },
    catAxisLabelColor: C.muted, valAxisLabelColor: C.muted,
    catAxisLabelFontFace: F.body, valAxisLabelFontFace: F.body,
    catAxisLabelFontSize: 9, valAxisLabelFontSize: 9,
    valGridLine: { color: C.panelLine, size: 0.5 },
    catGridLine: { style: "none" },
    showLegend: true, legendPos: "b",
    legendColor: C.muted, legendFontFace: F.body, legendFontSize: 9,
    lineSize: 3, lineSmooth: true,
    lineDataSymbol: "circle", lineDataSymbolSize: 6,
  });
  footer(s, pageNum);
}
// Use: chartPanel(12, "VISIBILITY CURVE",
//   [{text:"From invisible to "}, {text:"category authority", italic:true}, {text:"."}],
//   "Weekly share-of-model index.",
//   { type: pres.charts.LINE, data: [
//     { name: "Share of model", labels: ["W1","W2","W3","W4","W5","W6"], values: [16,22,32,46,58,76] },
//   ]});
```

### Dashboard (v2 — REAL data inside, not just a placeholder label)

The v1 dashboard pattern produced an empty panel with one text label inside. Useless on a real deliverable. The v2 pattern composes KPI tiles + a chart panel + a legend strip so the slide feels like a product screenshot.

```javascript
function dashboardSnapshot(eyebrowText, titleFrags, ledeText, kpis, chart, pageNum = PG()) {
  // kpis: [{label, value, delta, highlight?}] — 3-4 items
  // chart: { type, data } — same shape as chartPanel
  const s = mk(pres.addSlide());
  eyebrow(s, eyebrowText, 0.6, 0.6, 10);
  const sz = titleSizeForLength(fragLen(titleFrags), { max: 32 });
  title(s, titleFrags, 0.6, 1.0, 12.1, 0.9, { fontSize: sz });
  if (ledeText) lede(s, ledeText, 0.6, 1.95, 12.1, 0.5, { fontSize: 14 });
  // KPI strip at top of the data area
  kpiRow(s, kpis, 0.6, 2.6, 12.1, 1.4);
  // Chart panel below
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x: 0.6, y: 4.2, w: 12.1, h: 2.6, rectRadius: 0.10,
    fill: { color: C.panelDark }, line: { color: C.panelLine, width: 0.5 },
  });
  s.addChart(chart.type, chart.data, {
    x: 0.85, y: 4.35, w: 11.6, h: 2.35,
    chartColors: ["B9E045", "8AA833", "9CA3AF"],
    chartArea: { fill: { color: C.panelDark } },
    plotArea: { fill: { color: C.panelDark } },
    catAxisLabelColor: C.muted, valAxisLabelColor: C.muted,
    catAxisLabelFontFace: F.body, valAxisLabelFontFace: F.body,
    catAxisLabelFontSize: 8, valAxisLabelFontSize: 8,
    valGridLine: { color: C.panelLine, size: 0.5 },
    catGridLine: { style: "none" },
    showLegend: false,
    lineSize: 2.5, lineSmooth: true,
    lineDataSymbol: "circle", lineDataSymbolSize: 5,
  });
  footer(s, pageNum);
}
```

### Heatmap dashboard (NEW — coverage matrix)

For "topic coverage" or "share-of-model by platform" slides. A 12×6 grid of cells where the fill is a lime-on-black blend driven by the data value.

```javascript
function heatmapDashboard(eyebrowText, titleFrags, ledeText, cols, rows, matrix, pageNum = PG()) {
  // matrix: rows × cols of 0–1 values. cols/rows are string labels.
  const s = mk(pres.addSlide());
  eyebrow(s, eyebrowText, 0.6, 0.6, 10);
  const sz = titleSizeForLength(fragLen(titleFrags), { max: 32 });
  title(s, titleFrags, 0.6, 1.0, 12.1, 0.9, { fontSize: sz });
  if (ledeText) lede(s, ledeText, 0.6, 1.95, 12.1, 0.5, { fontSize: 14 });

  // Panel frame
  const panelX = 0.6, panelY = 2.7, panelW = 12.1, panelH = 4.0;
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x: panelX, y: panelY, w: panelW, h: panelH, rectRadius: 0.10,
    fill: { color: C.panelDark }, line: { color: C.panelLine, width: 0.5 },
  });

  // Grid cells inside the panel, leaving room for axis labels
  const labelColW = 1.4, labelRowH = 0.3;
  const gridX = panelX + labelColW;
  const gridY = panelY + labelRowH + 0.2;
  const gridW = panelW - labelColW - 0.3;
  const gridH = panelH - labelRowH - 0.4;
  const cellW = gridW / cols.length;
  const cellH = gridH / rows.length;

  // Column headers
  cols.forEach((c, i) => {
    s.addText(c, {
      x: gridX + i * cellW, y: panelY + 0.18, w: cellW, h: labelRowH,
      fontFace: F.body, fontSize: 8, color: C.muted, bold: true,
      align: "center", valign: "middle", margin: 0, charSpacing: 1,
    });
  });
  // Row labels
  rows.forEach((r, i) => {
    s.addText(r, {
      x: panelX + 0.18, y: gridY + i * cellH, w: labelColW - 0.2, h: cellH,
      fontFace: F.body, fontSize: 9, color: C.muted, bold: true,
      align: "right", valign: "middle", margin: 0,
    });
  });
  // Cells — lime tint scales with value (0..1)
  matrix.forEach((row, r) => {
    row.forEach((v, c) => {
      const alpha = Math.max(0, Math.min(1, v));
      // Pre-blend lime (B9E045 = 185,224,69) over black at alpha
      const R = Math.round(185 * alpha).toString(16).padStart(2, "0");
      const G = Math.round(224 * alpha).toString(16).padStart(2, "0");
      const B = Math.round(69  * alpha).toString(16).padStart(2, "0");
      s.addShape(pres.shapes.RECTANGLE, {
        x: gridX + c * cellW + 0.03,
        y: gridY + r * cellH + 0.03,
        w: cellW - 0.06, h: cellH - 0.06,
        fill: { color: (R + G + B).toUpperCase() },
        line: { color: C.panelLine, width: 0.25 },
      });
    });
  });
  footer(s, pageNum);
}
```

### Breadcrumb-nav section (NEW — pulled from the source deck's clean slide-70 pattern)

For multi-stage processes where each slide highlights one stage. The pill row across the top is the navigation; the rest of the slide is the content for the active stage.

```javascript
function breadcrumbSection(eyebrowText, stages, activeIdx, titleFrags, gridItems, pageNum = PG()) {
  // stages: ["01 · Technical", "02 · Research", ...] (max 6)
  // gridItems: passed straight to numberedGrid
  const s = mk(pres.addSlide());
  eyebrow(s, eyebrowText, 0.6, 0.6, 10);
  breadcrumbPills(s, stages, activeIdx, 0.6, 1.1, 12.1, 0.5);
  const sz = titleSizeForLength(fragLen(titleFrags), { max: 36 });
  title(s, titleFrags, 0.6, 1.95, 12.1, 0.9, { fontSize: sz });
  if (gridItems && gridItems.length) {
    const cols = gridItems.length <= 4 ? gridItems.length
                : gridItems.length <= 8 ? 4 : Math.ceil(gridItems.length / 2);
    numberedGrid(s, gridItems, 0.6, 3.1, 12.1, 3.6, cols);
  }
  footer(s, pageNum);
}
```

### Showcase (NEW — embed source images at correct aspect ratio)

For slides where the visual IS the content: dashboard screenshots, platform UI, dense matrices, proprietary visualizations, author-illustrated diagrams. The default impulse is to define a fixed-size panel and let the image sit inside, but for images whose aspect ratio doesn't match the panel that produces large empty space around small images — looks broken. The fix is the opposite: size the panel to fit each image at its native aspect ratio plus consistent padding, then center the panel on the slide. Panels end up varying in size across the deck, but each one reads as a deliberate composition.

Three modes:
- `single` — default for one image
- `double` — two images side by side; works when both have similar aspect ratios
- `stacked` — two images stacked vertically; right choice when both are wide-and-thin (aspect > 2) or one is a chart + one is a strip caption

**Decision rule for two images:** if both are roughly square or similar in aspect ratio, use `double`. If both are wide-and-thin, use `stacked`. Never use `stacked` with two square images — they come out tiny; switch to `double`.

```javascript
function showcase(eyebrowText, titleFrags, imagePaths, opts = {}, pageNum = PG()) {
  // imagePaths: string | [string] | [string, string]
  // opts.mode: "single" | "double" | "stacked" (auto-picks if omitted with 2 images)
  // opts.caption: optional small lede above the image(s)
  const paths = Array.isArray(imagePaths) ? imagePaths : [imagePaths];
  const s = mk(pres.addSlide());
  eyebrow(s, eyebrowText, 0.6, 0.6, 10);
  const titleSz = titleSizeForLength(fragLen(titleFrags), { max: 36 });
  title(s, titleFrags, 0.6, 1.0, 12.1, 0.9, { fontSize: titleSz });
  let captionH = 0;
  if (opts.caption) {
    lede(s, opts.caption, 0.6, 1.9, 12.1, 0.4);
    captionH = 0.4;
  }

  // Available area for the image panel(s)
  const areaY = 2.05 + captionH;
  const areaH = 6.85 - areaY;  // stops before the footer line
  const areaW = 12.1;
  const PAD = 0.25;

  if (paths.length === 1) {
    // Single image — hug it
    const p = panelForImage(paths[0], areaW, areaH, PAD);
    const panelX = 0.6 + (areaW - p.panelW) / 2;
    const panelY = areaY + (areaH - p.panelH) / 2;
    card(s, panelX, panelY, p.panelW, p.panelH);
    s.addImage({
      path: paths[0],
      x: panelX + PAD, y: panelY + PAD,
      w: p.imgW, h: p.imgH,
    });
  } else if (paths.length === 2) {
    const mode = opts.mode || autoPickShowcaseMode(paths);
    if (mode === "stacked") {
      const slotH = (areaH - 0.2) / 2;
      paths.forEach((path, i) => {
        const p = panelForImage(path, areaW, slotH, PAD);
        const panelX = 0.6 + (areaW - p.panelW) / 2;
        const panelY = areaY + i * (slotH + 0.2) + (slotH - p.panelH) / 2;
        card(s, panelX, panelY, p.panelW, p.panelH);
        s.addImage({
          path, x: panelX + PAD, y: panelY + PAD,
          w: p.imgW, h: p.imgH,
        });
      });
    } else {
      // double — side by side
      const slotW = (areaW - 0.2) / 2;
      paths.forEach((path, i) => {
        const p = panelForImage(path, slotW, areaH, PAD);
        const panelX = 0.6 + i * (slotW + 0.2) + (slotW - p.panelW) / 2;
        const panelY = areaY + (areaH - p.panelH) / 2;
        card(s, panelX, panelY, p.panelW, p.panelH);
        s.addImage({
          path, x: panelX + PAD, y: panelY + PAD,
          w: p.imgW, h: p.imgH,
        });
      });
    }
  }
  footer(s, pageNum);
}

// Auto-pick stacked vs double for 2 images. Stacked when both are wide-thin
// (aspect > 2). Otherwise double. Never stack two near-square images.
function autoPickShowcaseMode(paths) {
  const aspects = paths.map(p => {
    const { w, h } = getPngDimensions(p);
    return w / h;
  });
  if (aspects.every(a => a > 2)) return "stacked";
  return "double";
}
```

### Closing CTA

```javascript
function closingCTA(titleFrags, offerHead, offerBody, contacts, pageNum = PG()) {
  // contacts: [{role, name, mail}]
  const s = mk(pres.addSlide());
  eyebrow(s, "NEXT STEP", 0.6, 0.6, 10);
  const sz = titleSizeForLength(fragLen(titleFrags), { max: 52 });
  title(s, titleFrags, 0.6, 1.0, 12.1, 1.5, { fontSize: sz });
  card(s, 0.6, 2.8, 12.1, 2.2);
  s.addText("COMPLIMENTARY  ·  FOR QUALIFIED BRANDS", {
    x: 0.85, y: 2.95, w: 11.6, h: 0.3,
    fontFace: F.body, fontSize: 9, color: C.lime, bold: true,
    charSpacing: 2, valign: "middle", margin: 0,
  });
  s.addText(offerHead, { x: 0.85, y: 3.3, w: 11.6, h: 0.5,
    fontFace: F.display, fontSize: 22, color: C.white, bold: true,
    valign: "middle", margin: 0 });
  s.addText(offerBody, { x: 0.85, y: 3.85, w: 11.6, h: 0.9,
    fontFace: F.body, fontSize: 11, color: C.white, valign: "top", margin: 0 });
  const cw = 3.95, gap = 0.18;
  contacts.forEach((c, i) => {
    const cx = 0.6 + i * (cw + gap);
    card(s, cx, 5.3, cw, 1.4);
    s.addText(c.role.toUpperCase(), { x: cx + 0.2, y: 5.4, w: cw - 0.4, h: 0.3,
      fontFace: F.body, fontSize: 9, color: C.lime, bold: true,
      charSpacing: 2, valign: "middle", margin: 0 });
    s.addText(c.name, { x: cx + 0.2, y: 5.75, w: cw - 0.4, h: 0.4,
      fontFace: F.display, fontSize: 16, color: C.white, bold: true,
      valign: "middle", margin: 0 });
    s.addText(c.mail, { x: cx + 0.2, y: 6.2, w: cw - 0.4, h: 0.4,
      fontFace: F.body, fontSize: 10, color: C.white, valign: "middle", margin: 0 });
  });
  footer(s, pageNum);
}
```

### Timeline track (mirrors source HTML slide 2)

For "track record", "roadmap", "phases" content. Four columns with year + label + body, anchored to a horizontal dotted lime track at the top. Optional summary card at the bottom.

```javascript
function timeline(eyebrowText, titleFrags, ledeText, cols, summaryFrags, pageNum = PG()) {
  // cols: [{year, label, text}] — exactly 4 items work best
  const s = mk(pres.addSlide(), "aurora");
  eyebrow(s, eyebrowText, 0.6, 0.6, 10);
  const sz = titleSizeForLength(fragLen(titleFrags), { max: 44 });
  title(s, titleFrags, 0.6, 1.0, 12.1, 1.0, { fontSize: sz });
  if (ledeText) lede(s, ledeText, 0.6, 2.0, 11.5, 0.5, { fontSize: 15 });

  // Dotted hairline track — horizontal line + dots above each column
  const trackY = 3.0, trackX = 0.9, trackW = 11.5;
  s.addShape(pres.shapes.LINE, {
    x: trackX, y: trackY, w: trackW, h: 0,
    line: { color: C.lime, width: 0.75, transparency: 50 },
  });
  const colW = trackW / cols.length;
  cols.forEach((col, i) => {
    const cx = trackX + i * colW + colW / 2;
    s.addShape(pres.shapes.OVAL, {
      x: cx - 0.10, y: trackY - 0.10, w: 0.20, h: 0.20,
      fill: { color: C.lime }, line: { color: C.lime, width: 0 },
    });
    const baseX = trackX + i * colW + 0.1;
    s.addText(col.year, { x: baseX, y: trackY + 0.35, w: colW - 0.2, h: 0.35,
      fontFace: F.display, fontSize: 14, color: C.lime, bold: true,
      valign: "top", margin: 0 });
    s.addText(col.label, { x: baseX, y: trackY + 0.75, w: colW - 0.2, h: 0.5,
      fontFace: F.display, fontSize: 18, color: C.white, bold: true,
      valign: "top", margin: 0, charSpacing: -0.5 });
    s.addText(col.text, { x: baseX, y: trackY + 1.35, w: colW - 0.2, h: 1.6,
      fontFace: F.body, fontSize: 10, color: C.white,
      valign: "top", margin: 0 });
  });

  // Optional summary card at the bottom (the lime-keyline pull-quote pattern)
  if (summaryFrags) {
    card(s, 0.6, 6.0, 12.1, 0.85);
    const summarySize = titleSizeForLength(fragLen(summaryFrags), { max: 16, min: 11 });
    title(s, summaryFrags, 0.85, 6.15, 11.6, 0.55, { fontSize: summarySize });
  }
  footer(s, pageNum);
}
```

### Service stack with colored category dots (mirrors source HTML slide 4)

For "what we do" / service-vocabulary content. 5 columns separated by hairlines, each anchored by a colored category dot in the logo-accent palette. The colored dots are the **one** approved moment for non-lime accents in the deck — every other element should stay monochrome-plus-lime.

```javascript
// The logo-accent palette — used ONLY as service-category dots, never in body
// copy, never in callouts. Order matters: cyan / yellow / emerald / pink / lime.
const SERVICE_DOTS = ["2DE4FF", "FFE334", "10B981", "FF6671", "B9E045"];

function serviceStack(eyebrowText, titleFrags, ledeText, cols, pageNum = PG()) {
  // cols: [{head, items: [string, ...]}] — up to 5 items, items typically 4-6 each
  const s = mk(pres.addSlide(), "aurora");
  eyebrow(s, eyebrowText, 0.6, 0.6, 10);
  const sz = titleSizeForLength(fragLen(titleFrags), { max: 44 });
  title(s, titleFrags, 0.6, 1.0, 12.1, 1.0, { fontSize: sz });
  if (ledeText) lede(s, ledeText, 0.6, 2.0, 11.5, 0.5, { fontSize: 15 });

  const colWidth = 12.1 / cols.length;
  const startY = 3.0;
  cols.forEach((col, i) => {
    const cx = 0.6 + i * colWidth;
    // Hairline divider between columns (right of col, except last)
    if (i < cols.length - 1) {
      s.addShape(pres.shapes.LINE, {
        x: cx + colWidth - 0.05, y: startY + 0.2, w: 0, h: 3.2,
        line: { color: C.panelLine, width: 0.5 },
      });
    }
    // Colored category dot — the rare non-lime accent
    const dotColor = SERVICE_DOTS[i % SERVICE_DOTS.length];
    s.addShape(pres.shapes.OVAL, {
      x: cx + 0.1, y: startY + 0.05, w: 0.18, h: 0.18,
      fill: { color: dotColor }, line: { color: dotColor, width: 0 },
    });
    s.addText(String(i + 1).padStart(2, "0"), {
      x: cx + 0.35, y: startY, w: colWidth - 0.4, h: 0.3,
      fontFace: F.body, fontSize: 10, color: C.muted, bold: true,
      charSpacing: 2.5, valign: "middle", margin: 0,
    });
    s.addText(col.head, {
      x: cx + 0.1, y: startY + 0.35, w: colWidth - 0.2, h: 0.6,
      fontFace: F.display, fontSize: 16, color: C.white, bold: true,
      valign: "top", margin: 0, charSpacing: -0.3,
    });
    s.addText(col.items.join("\n"), {
      x: cx + 0.1, y: startY + 1.0, w: colWidth - 0.2, h: 2.5,
      fontFace: F.body, fontSize: 11, color: C.white,
      valign: "top", margin: 0, paraSpaceAfter: 4,
    });
  });
  footer(s, pageNum);
}
```

## Finishing the build

```javascript
pres.writeFile({ fileName: "/mnt/user-data/outputs/<deck-name>.pptx" })
  .then(fn => console.log("Wrote", fn));
```

Then `present_files` the .pptx path. Tell the user: open in PowerPoint or upload to Google Drive → right-click → Open with Google Slides. Note that Google Slides will substitute Inter with Arial, and may flatten the italic-lime hinges on some titles. Both are accepted losses.

## QA — required before declaring success

The single most common defect in this skill is text overflow / overlap. The second is silent image stretching from `sizing: contain`. Always:

1. **Convert the deck to images** with `soffice → pdftoppm`:
   ```bash
   python /mnt/skills/public/pptx/scripts/office/soffice.py --headless --convert-to pdf /mnt/user-data/outputs/<deck>.pptx
   pdftoppm -jpeg -r 100 /mnt/user-data/outputs/<deck>.pdf /home/claude/work/qa
   ls /home/claude/work/qa-*.jpg
   ```

2. **View each slide** with the view tool. Look for:
   - Numbers crashing through labels (was the v1 bigStat / kpiRow bug)
   - Title text running into the accent line or hero image
   - Italic-lime fragments wrapping mid-phrase (tighten the phrase or add `breakAfter: true` before the italic group)
   - Empty panels with just a label (was the v1 dashboard bug — use `dashboardSnapshot` / `heatmapDashboard` / `chartPanel` instead)
   - Footer collisions

3. **For reskins, render the source deck to JPEGs and side-by-side compare** against the build. This is the step that catches dropped content, dropped attribution, missing secondary callouts, and miscounted slides. Skipping this is how content goes missing on a "reskin."

4. **For any slide with embedded images, verify in actual PowerPoint or Google Slides at least once.** The pptxgenjs `sizing: { type: "contain" }` bug is silent in LibreOffice/PDF previews — images render correctly there but stretch to the explicit w×h in PowerPoint/Slides, smearing screenshot text horizontally. PDF preview alone will NOT catch this. Open the .pptx in actual PowerPoint or upload to Google Slides for a visual confirmation. If a screenshot looks stretched, you used `sizing: contain` — replace with `fitImageToArea()`.

5. **If a slide is broken,** add `breakAfter: true` to fragments to force good line breaks, pass an explicit `opts.fontSize` smaller than the auto-size suggests, or use `fitImageToArea()` / `showcase` for images. Re-render and re-inspect.

6. **Stop after one fix-cycle** unless a new defect appears. Do not loop on sub-pixel positioning.

## Lossy mapping cheat sheet (what to drop, what to keep)

| Brand feature in HTML | PPTX strategy |
|---|---|
| Aurora radial gradient background | Use `assets/bg-aurora.jpg` via `mk(slide, "aurora")`. Acceptable substitute for solid black. |
| Starfield background | Use `assets/bg-starfield.png` via `mk(slide, "starfield")`. Best with hero objects. |
| Backdrop blur / glass cards | Solid `C.card` (`#111114`) with 0.5pt lime stroke. |
| Outer lime glow on cards | Omit. The keyline alone reads. |
| Italic-lime hinge in title | Use rich-text fragments. Survives PowerPoint; may flatten on Slides import. |
| SVG line chart with gradient | `pres.charts.LINE` with `chartColors: ["B9E045"]`. Solid stroke. |
| 3D hero objects (rocket, gem, prism) | Ship the raster from `assets/` directly via `addImage`. Never redraw as SVG. |
| Inter typeface | Declare `fontFace: "Inter"`. Slides falls back to Arial — accept it. |
| Animated GIF (prism rotation) | Static PNG of first frame. |
| Heatmap (color-graded cell fills) | Use `heatmapDashboard` — computes per-cell hex via lime-on-black blend. |
| Dense source screenshots / dashboards / matrices | Embed via `showcase` archetype with `fitImageToArea()`. Never `sizing: contain`. |
| Simple source charts (bar / line / donut) | Rebuild native in lime via `pres.charts.LINE / BAR`. Preserve data points exactly. |

## Authoring rules (v2 additions)

These are the rules that fix the v1 defects. Follow them or the bugs come back.

1. **Never hard-code `fontSize` for variable text.** Numbers, KPI values, and titles must use `autoFit()` or `titleSizeForLength()`. Only hard-code when you've manually verified the content length is fixed.

2. **Italic-lime title fragments have hard length limits.** The brand pattern is `[plain prefix] + [italic accent] + [period]`. When the italic exceeds these limits the title wraps mid-italic and crashes through any lede beneath it:
   - **Italic accent: ≤22 characters.** Tighten the phrase if longer.
   - **Total title: ≤40 characters at default 36pt.** `titleSizeForLength` should drop to 30pt at >50 chars, 26pt above.
   - Recovery order when QA catches an overflow: (1) tighten the italic phrase → (2) tighten the plain prefix → (3) force a smaller `opts.fontSize` (last resort).
   - When the italic must stay long, force the break: put `breakAfter: true` on the fragment *before* the italic group so the italic starts on a fresh line.
   ```js
   // BAD — italic wraps mid-phrase
   [{text:"Taking over "}, {text:"ChatGPT, Gemini, Perplexity, & Claude", italic:true}, {text:"."}]
   // GOOD — italic starts on its own line
   [{text:"Taking over", breakAfter:true}, {text:"ChatGPT, Gemini, Perplexity, & Claude", italic:true}, {text:"."}]
   ```

3. **Never use pptxgenjs `sizing: { type: "contain" }`.** It silently stretches images in PowerPoint/Slides while rendering correctly in LibreOffice/PDF previews. Use `fitImageToArea()` or the `showcase` archetype, both of which read the source PNG's true dimensions and pass exact w/h to `addImage`.

4. **Hug the image, don't contain the image.** When embedding source visuals, size the *panel* to the image's aspect ratio + consistent padding (0.25" works), then center the panel on the slide. Don't force images into fixed-size panels — for off-aspect images, that produces large empty space around tiny images. Use `showcase`.

5. **Don't hard-code page numbers — let `PG()` do the counting.** Every archetype takes `pageNum = PG()` as its trailing optional parameter, so just omit it entirely at the call site:
   ```js
   cover("Winning visibility", [...], { aurora: true });   // becomes slide 1
   sectionOpener("INSIGHT", titleFrags, "lede text");      // becomes slide 2
   bigStat("5x", labelFrags, "Source: …");                  // becomes slide 3
   ```
   The counter increments in build order, so inserts / reorders / deletes during iteration are free — no renumbering needed. To force a specific page number, pass it as the last positional argument (`bigStat("5x", labelFrags, "Source", "THE PROOF", 7)`). For inline-built (non-factory) slide blocks, capture once at the top: `const pg = PG(); ...; footer(s, pg);` — pass `pg`, not `PG()` again, since the second call double-increments. Don't mix explicit and defaulted page numbers in the same deck — they'll drift out of sync.

6. **Never use an empty dashboard panel as a placeholder.** If you don't have real data, either omit the slide or substitute with `chartPanel` using illustrative data (and add a `ILLUSTRATIVE · NOT TO SCALE` source line).

7. **Use the brand assets.** A 70-slide deck without a single rocket / gem / aurora background looks generic. Use `cover` with `{ aurora: true }`, drop in `sectionOpenerHero` once or twice per major section.

8. **Use `breadcrumbSection` for any multi-stage process.** The pattern from slide 70 of the source deck is the cleanest section-nav we have — pulling it out as an archetype makes the deck feel coherent across long process spans.

## Scope guidance

- **≤15 slides**: one tool turn is fine.
- **16–30 slides**: build in one script, but inline-emit slide-by-slide and save after every ~10.
- **31+ slides**: batch. Build 10–15 slides, write the .pptx, present it, then continue with the same script appended. Never try to build 50+ slides in a single tool turn.

If the source deck is over 50 slides, ask the user up front whether to deliver the full deck or a strategic subset (cover + key sections + CTA) — often the appendix slides aren't worth the rebuild.
