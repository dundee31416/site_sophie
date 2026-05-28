// reader.jsx — fullscreen book reader: single page, prev/next, scan↔digital toggle.
const { useState: useStateR, useEffect: useEffectR, useRef: useRefR } = React;

function Reader({ book, author, openMode, onClose }) {
  const [page, setPage] = useStateR(0);
  const [mode, setMode] = useStateR(openMode || "digital"); // 'digital' | 'scan'
  const [dir, setDir] = useStateR(1); // animation direction
  const total = book.pages.length;

  const go = (d) => {
    setPage((p) => {
      const n = Math.min(total - 1, Math.max(0, p + d));
      if (n !== p) setDir(d);
      return n;
    });
  };

  useEffectR(() => {
    const onKey = (e) => {
      if (e.key === "ArrowRight") go(1);
      else if (e.key === "ArrowLeft") go(-1);
      else if (e.key === "Escape") onClose();
      else if (e.key.toLowerCase() === "o") setMode("scan");
      else if (e.key.toLowerCase() === "n") setMode("digital");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [total]);

  const pageData = book.pages[page];

  return (
    <div className="reader">
      <div className="reader-bar">
        <button className="btn-back" onClick={onClose}><Icon.back /> Étagère</button>
        <div className="reader-titles">
          <div className="rt-title">{book.title}</div>
          <div className="rt-author">par {author.name}, {author.age} ans</div>
        </div>
        <div className="mode-toggle" data-mode={mode}>
          <span className="mode-pill" style={{ background: book.color }} />
          <button data-m="digital" className={mode === "digital" ? "on" : ""} onClick={() => setMode("digital")}>
            <Icon.book s={17} /> Numérique
          </button>
          <button data-m="scan" className={mode === "scan" ? "on" : ""} onClick={() => setMode("scan")}>
            <Icon.scan s={17} /> Original
          </button>
        </div>
      </div>

      <div className="reader-stage">
        <button className="nav-arrow" onClick={() => go(-1)} disabled={page === 0} aria-label="Page précédente"><Icon.arrowL /></button>

        <div className="page-frame">
          <div key={mode + "-" + page} className={"page-inner " + (dir > 0 ? "page-flip-enter" : "page-flip-back")}>
            {mode === "digital" ? (
              <div className="digital-page">
                <IlloSlot label={pageData.illoLabel} color={book.color} />
                <div className="page-text">{pageData.text}</div>
              </div>
            ) : (
              <ScannedPage book={book} pageIndex={page} total={total} />
            )}
          </div>
        </div>

        <button className="nav-arrow" onClick={() => go(1)} disabled={page === total - 1} aria-label="Page suivante"><Icon.arrowR /></button>
      </div>

      <div className="dots-row">
        <span className="page-counter">Page {page + 1} / {total}</span>
        <span className="dots-track">
        {book.pages.map((_, i) => (
          <button key={i} className={"pdot " + (i === page ? "cur" : i < page ? "done" : "")}
            onClick={() => { setDir(i > page ? 1 : -1); setPage(i); }} aria-label={`Page ${i + 1}`} />
        ))}
        </span>
      </div>
    </div>
  );
}

window.Reader = Reader;
