/* RevenueMix.jsx — 65 / 20 / 15 KPI tiles with SaaS multiple footnote */
function RevenueMix() {
  const tiles = [
    { cap: "Foundation", pct: "65", title: "Core Digital Services", desc: "High‑stability, recurring contracts. Scalable foundation for enterprise growth." },
    { cap: "Leverage",   pct: "20", title: "AI‑Enabled Services",   desc: "Higher‑margin delivery powered by gOS. Operational leverage without headcount." },
    { cap: "Multiple",   pct: "15", title: "Tech Product Revenue",  desc: "Pure IP revenue. AEO and AIaaS subscriptions. 90%+ gross margins.", featured: true },
  ];

  return (
    <section className="mk-section" id="financials" data-screen-label="Revenue mix">
      <div className="mk-eyebrow">Mix · 2026</div>
      <h2 className="mk-h2">Future‑proofing the <em>revenue mix</em>.</h2>
      <p className="mk-lede">
        Transitioning to a high‑multiple tech‑led model — 18 months ago we were
        100% core digital.
      </p>
      <div className="mk-kpi-grid">
        {tiles.map(t => (
          <div className={"mk-kpi" + (t.featured ? " featured" : "")} key={t.cap}>
            <div className="cap">{t.cap}</div>
            <div className="pct">{t.pct}<em>%</em></div>
            <div className="ttl">{t.title}</div>
            <div className="desc">{t.desc}</div>
          </div>
        ))}
      </div>
      <div className="mk-mix-footnote">
        As Tech/IP revenue crosses <em>30%</em> of the mix, Moburst justifies a{" "}
        <em>SaaS‑level multiple</em> (10×–15×) on revenue rather than a service‑level multiple.
      </div>
    </section>
  );
}

window.RevenueMix = RevenueMix;
