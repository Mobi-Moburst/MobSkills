/* Timeline.jsx — 13 years of evolution */
const TIMELINE_STAGES = [
  { year: "2013 – 2018", title: "Foundation", body: "Opened IL & US offices. Secured Google as anchor client with 30+ brands. Scaled organically to sustainable profitability." },
  { year: "2019 – 2023", title: "M&A Proof",  body: "Acquired Clutch (Video/UI‑UX) and Layer (Web/App Dev). Proved the integration playbook. Reached $5M EBITDA." },
  { year: "2024 – 2025", title: "Scale",      body: "Acquired Uproar PR, Kitcaster, Rhythm. Consolidated 5 firms into one operational stack. Heavy R&D into AI." },
  { year: "2026",        title: "Inflection", body: "Full migration to AI‑native delivery. 10 proprietary AI products live. 2 additional acquisitions in active DD." },
];

function Timeline() {
  return (
    <section className="mk-section" id="track-record" data-screen-label="Timeline">
      <div className="mk-eyebrow">Track record</div>
      <h2 className="mk-h2">13 years of disciplined <em>evolution</em>.</h2>
      <p className="mk-lede">
        From agency roots to a tech‑enabled platform — built through organic growth
        and strategic M&amp;A.
      </p>
      <div className="mk-timeline">
        {TIMELINE_STAGES.map(s => (
          <div className="stage" key={s.year}>
            <div className="year">{s.year}</div>
            <div className="ttl">{s.title}</div>
            <div className="txt">{s.body}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

window.Timeline = Timeline;
