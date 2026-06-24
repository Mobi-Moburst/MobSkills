/* Closing.jsx — call to action + team contacts */
function Closing({ onOpenDataRoom }) {
  return (
    <section className="mk-closing" id="team" data-screen-label="Closing">
      <div className="ring"></div>
      <div className="grid">
        <div>
          <div className="mk-eyebrow">The horizon to $500M</div>
          <h2 className="mk-display">
            Join the<br/>
            Growth Operating <em>System</em>.
          </h2>
          <div className="lines">
            <p><strong>The infrastructure is built.</strong></p>
            <p><strong>The growth is realized.</strong></p>
            <p>The <em>$125M entry window</em> is closing.</p>
          </div>
          <div style={{marginTop:"32px", display:"flex", gap:"16px"}}>
            <button className="mk-btn mk-btn--primary" onClick={onOpenDataRoom}>
              Request data room <span style={{fontSize:"16px"}}>→</span>
            </button>
            <button className="mk-btn mk-btn--ghost">Download memo (PDF)</button>
          </div>
        </div>
        <div className="mk-team">
          <div className="card">
            <div className="role">CEO</div>
            <div className="name">Gilad Bechar</div>
            <div className="mail">gilad@moburst.com</div>
          </div>
          <div className="card">
            <div className="role">COO</div>
            <div className="name">Lior Eldan</div>
            <div className="mail">lior@moburst.com</div>
          </div>
          <div className="card">
            <div className="role">Director · Corp Dev</div>
            <div className="name">Snir Shervi</div>
            <div className="mail">snir.shervi@moburst.com</div>
          </div>
        </div>
      </div>
    </section>
  );
}

window.Closing = Closing;
