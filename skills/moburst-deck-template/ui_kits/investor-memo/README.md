# Moburst — Investor Memorandum UI kit

A hi‑fi, clickable recreation of the Moburst investor memorandum as a **single‑page scrolling microsite**. The deck is the source; this is the web translation of that same story.

> The deck has 8 slides; this kit recreates 5 of them as web sections + adds an interactive **data room request** modal. Everything matches the deck's visual vocabulary (lime keyline, Inter 700, aurora void, footer stamp).

## Files

```
index.html         ← entry point; loads React + Babel + JSX modules
styles.css         ← microsite layout / components (uses tokens from /colors_and_type.css)
App.jsx            ← root composition + data-room modal state
Header.jsx         ← sticky glass nav with section scroll tracking
Hero.jsx           ← "The AI-Native Growth OS" hero + animated M prism
Timeline.jsx       ← 13 years of evolution (4 horizontal stages)
ServiceStack.jsx   ← 25+ services in 5 columns (hover → lime keyline)
RevenueMix.jsx     ← 65 / 20 / 15 KPI tiles + SaaS-multiple footnote
Closing.jsx        ← Join the GOS + team cards
DataRoomModal.jsx  ← investor-detail form → success state
```

## Interactions to try

1. **Click "Request data room"** in the header → modal opens → fill the form → submit → success state with name interpolation. The same CTA is on the hero and the closing.
2. **Scroll** — the header's section indicator follows you (Memo / Track record / The stack / Financials / Team).
3. **Click a nav item** — smooth scrolls to the section.
4. **Hover a service column** — the keyline lifts to lime (the system's signature hover affordance).
5. **Click the modal backdrop or the × button** — closes.

## What's intentionally not here

- **No login / portal** — the deck is the source of truth; this is investor‑facing only.
- **No real product UI** — gOS has not been shared as a screen library, so no dashboard is mocked here.
- **No blog / case studies / marketing surface** — that lives on moburst.com and would be a different sub‑system (warmer voice).
- **No real backend** — the data‑room form is a UI prototype; submit logs locally only.
