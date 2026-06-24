/* Header.jsx — sticky top navigation for the investor memo microsite */
const { useState, useEffect } = React;

function Header({ onOpenDataRoom }) {
  const [active, setActive] = useState("memo");
  const items = [
    { id: "memo", label: "Memo" },
    { id: "track-record", label: "Track record" },
    { id: "stack", label: "The stack" },
    { id: "financials", label: "Financials" },
    { id: "team", label: "Team" },
  ];

  useEffect(() => {
    const onScroll = () => {
      // Track which section is in view
      for (const it of items) {
        const el = document.getElementById(it.id);
        if (!el) continue;
        const r = el.getBoundingClientRect();
        if (r.top <= 200 && r.bottom > 200) { setActive(it.id); return; }
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const go = (id) => (e) => {
    e.preventDefault();
    const el = document.getElementById(id);
    if (el) window.scrollTo({ top: el.offsetTop - 80, behavior: "smooth" });
  };

  return (
    <header className="mk-header">
      <a href="#memo" className="lockup" onClick={go("memo")}>
        <img src="../../assets/logo-moburst-color.png" alt="" />
        <span>Moburst</span>
      </a>
      <nav>
        {items.map(it => (
          <a key={it.id} className={active === it.id ? "active" : ""} onClick={go(it.id)}>
            {it.label}
          </a>
        ))}
      </nav>
      <button className="mk-btn mk-btn--primary" onClick={onOpenDataRoom}>
        Request data room
        <span style={{fontSize:"16px", lineHeight:"1"}}>→</span>
      </button>
    </header>
  );
}

window.Header = Header;
