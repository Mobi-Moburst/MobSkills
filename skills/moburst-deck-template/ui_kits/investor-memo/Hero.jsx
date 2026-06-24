/* Hero.jsx — opening section with the AI-Native title and the animated M prism */
function Hero({ onOpenDataRoom }) {
  return (
    <section className="mk-hero" id="memo" data-screen-label="Hero">
      <div className="copy">
        <div className="mk-eyebrow">Investment memorandum · 2026</div>
        <h1>
          The AI‑Native<br/>
          Growth Operating <em>System</em>.
        </h1>
        <p className="sub">
          The software‑driven operating system powering the future of digital growth.
          25+ services, one stack, one proprietary AI core.
        </p>
        <div className="cta-row">
          <button className="mk-btn mk-btn--primary" onClick={onOpenDataRoom}>
            Request data room <span style={{fontSize:"16px"}}>→</span>
          </button>
          <button className="mk-btn mk-btn--secondary">
            Read the memo
          </button>
        </div>
      </div>
      <div className="visual">
        <img src="../../assets/img-services-loop.png" alt="Moburst services orchestrated by gOS" />
      </div>
    </section>
  );
}

window.Hero = Hero;
