/* DataRoomModal.jsx — modal that asks for investor details */
const { useState: useStateDR } = React;

function DataRoomModal({ open, onClose }) {
  const [submitted, setSubmitted] = useStateDR(false);
  const [form, setForm] = useStateDR({ name: "", firm: "", email: "", ticket: "$10M – $25M" });

  if (!open) return null;
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = (e) => {
    e.preventDefault();
    setSubmitted(true);
  };

  const close = () => {
    onClose();
    // reset for next time
    setTimeout(() => setSubmitted(false), 200);
  };

  return (
    <div className="mk-modal-scrim" onClick={close}>
      <div className="mk-modal" onClick={(e) => e.stopPropagation()} data-screen-label="Data room modal">
        <button className="close" onClick={close} aria-label="Close">×</button>
        {!submitted ? (
          <form onSubmit={submit}>
            <h3>Request the data room.</h3>
            <p className="lede">
              Pre‑qualified institutional investors only. We'll respond within 48 hours
              with NDA and access.
            </p>
            <div className="row">
              <div className="field">
                <label>Name</label>
                <input required value={form.name} onChange={set("name")} placeholder="Jane Investor" />
              </div>
              <div className="field">
                <label>Firm</label>
                <input required value={form.firm} onChange={set("firm")} placeholder="Sequoia Growth" />
              </div>
            </div>
            <div className="field">
              <label>Email</label>
              <input required type="email" value={form.email} onChange={set("email")} placeholder="jane@firm.com" />
            </div>
            <div className="field">
              <label>Ticket size</label>
              <select value={form.ticket} onChange={set("ticket")}>
                <option>$5M – $10M</option>
                <option>$10M – $25M</option>
                <option>$25M – $50M</option>
                <option>$50M+</option>
              </select>
            </div>
            <button type="submit" className="mk-btn mk-btn--primary submit">
              Request access <span style={{fontSize:"16px"}}>→</span>
            </button>
          </form>
        ) : (
          <div className="success">
            <div className="check">✓</div>
            <h3>Request received.</h3>
            <p className="lede">
              Thanks, {form.name.split(" ")[0] || "investor"}. The corp‑dev team will reach
              out to {form.email} within 48 hours.
            </p>
            <button className="mk-btn mk-btn--secondary submit" onClick={close}>Close</button>
          </div>
        )}
      </div>
    </div>
  );
}

window.DataRoomModal = DataRoomModal;
