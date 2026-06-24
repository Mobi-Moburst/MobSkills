/* App.jsx — composes the investor memo microsite */
const { useState: useStateApp } = React;

function App() {
  const [drOpen, setDrOpen] = useStateApp(false);
  const openDR = () => setDrOpen(true);
  const closeDR = () => setDrOpen(false);

  return (
    <React.Fragment>
      <Header onOpenDataRoom={openDR} />
      <main>
        <Hero onOpenDataRoom={openDR} />
        <Timeline />
        <ServiceStack />
        <RevenueMix />
        <Closing onOpenDataRoom={openDR} />
      </main>
      <footer className="mk-footer">
        <span>Private · Confidential · Investment Memorandum · 2026</span>
        <span>Moburst · gOS</span>
      </footer>
      <DataRoomModal open={drOpen} onClose={closeDR} />
    </React.Fragment>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
