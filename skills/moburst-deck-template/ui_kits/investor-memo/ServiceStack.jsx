/* ServiceStack.jsx — 25+ services across 5 columns */
const SERVICE_COLUMNS = [
  { num: "01", title: "Marketing Strategy",  items: ["Mobile Strategy", "Digital Strategy", "Social Strategy", "Product Strategy", "BI & Analytics"] },
  { num: "02", title: "Organic Awareness",   items: ["SEO & AEO", "ASO", "CRO", "PR & Thought Leadership", "Content & Localization"] },
  { num: "03", title: "Creative & Content",  items: ["Concept & Design", "Video Production", "Social Media Mgmt", "App Store Assets", "Army of Creators (UGC)"] },
  { num: "04", title: "Media Buying",        items: ["Social & Search", "Networks & RTBs", "Influencer Marketing", "Email Marketing", "OTT Advertising"] },
  { num: "05", title: "Product & Dev",       items: ["Product Consulting", "UI / UX", "Website Development", "App Development", "AI & Digital Transformation"] },
];

function ServiceStack() {
  return (
    <section className="mk-section" id="stack" data-screen-label="Service stack">
      <div className="mk-eyebrow">What we do</div>
      <h2 className="mk-h2">25+ services. <em>One stack</em>.</h2>
      <p className="mk-lede">
        A single operational chassis covering strategy, organic, creative, media and
        product‑dev — orchestrated by gOS.
      </p>
      <div className="mk-services">
        {SERVICE_COLUMNS.map(c => (
          <div className="col" key={c.num}>
            <div className="num">{c.num}</div>
            <div className="ttl">{c.title}</div>
            <div className="lst">
              {c.items.map(i => <div key={i}>{i}</div>)}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

window.ServiceStack = ServiceStack;
