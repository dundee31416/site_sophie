// app.jsx — Lisons! main app: header, author filter, search, book shelf.
const { useState, useMemo } = React;
const { AUTHORS, BOOKS } = window.LISONS_DATA;
const authorById = Object.fromEntries(AUTHORS.map((a) => [a.id, a]));

const SETTINGS = {
  homepageLayout: "grid",       // "grid" | "shelf" | "board"
  showBadges: true,
  storyFont: "Patrick Hand",
  openMode: "digital",          // "digital" | "scan"
};

function Logo({ onClick }) {
  const letters = "Lisons".split("");
  return (
    <div className="logo" onClick={onClick}>
      {letters.map((c, i) => <span key={i} className={"l" + i}>{c}</span>)}
      <span className="bang">!</span>
      <span className="logo-sub">les histoires de la maison</span>
    </div>
  );
}

function NewBadge() { return <div className="new-badge">Nouveau</div>; }

function BookCard({ book, onOpen, showBadges }) {
  const author = authorById[book.author];
  return (
    <button className="book-card" onClick={() => onOpen(book)}>
      <div className="card-cover-frame">
        {showBadges && book.isNew && <NewBadge />}
        <CoverArt book={book} author={author} />
      </div>
      <div className="card-meta">
        <div className="card-title">{book.title}</div>
        <div className="card-author"><span className="dot" style={{ background: author.color }} /> {author.name}</div>
      </div>
    </button>
  );
}

function chunk(arr, n) {
  const out = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
}

function AuthorBio({ author }) {
  return (
    <div className="bio-card" style={{ boxShadow: `5px 6px 0 ${author.color}` }}>
      <Avatar author={author} size={90} />
      <div className="bio-text">
        <h2>{author.name}</h2>
        <div className="bio-meta">{author.age} ans · {BOOKS.filter((b) => b.author === author.id).length} histoires</div>
        <p>{author.bio}</p>
        <div className="bio-favo">« {author.favo} »</div>
      </div>
    </div>
  );
}

function Home({ onOpen }) {
  const [author, setAuthor] = useState("all");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    return BOOKS.filter((b) => {
      if (author !== "all" && b.author !== author) return false;
      if (query.trim() && !b.title.toLowerCase().includes(query.trim().toLowerCase())) return false;
      return true;
    });
  }, [author, query]);

  const layoutClass = "layout-" + SETTINGS.homepageLayout;
  const activeAuthor = author !== "all" ? authorById[author] : null;

  const grid = (
    <div className="book-grid">
      {filtered.map((b) => <BookCard key={b.id} book={b} onOpen={onOpen} showBadges={SETTINGS.showBadges} />)}
    </div>
  );

  return (
    <div className={"app-bg " + layoutClass}>
      <header className="site-header">
        <Logo onClick={() => { setAuthor("all"); setQuery(""); }} />
        <label className="search">
          <Icon.search s={20} />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Chercher un titre…" />
        </label>
      </header>

      <section className="hero">
        <h1>La bibliothèque de Sophie &amp; Alice</h1>
        <p>Des histoires écrites, dessinées et inventées à la maison.</p>
        <div className="filter-label">Choisis un auteur&nbsp;:</div>
        <div className="author-filter">
          <button className="author-pick" onClick={() => setAuthor("all")}>
            <AllAvatar size={64} active={author === "all"} />
            <span className="pick-name">Tout le monde</span>
            <span className="pick-meta">{BOOKS.length} histoires</span>
          </button>
          {AUTHORS.map((a) => (
            <button key={a.id} className="author-pick" onClick={() => setAuthor(a.id)}>
              <Avatar author={a} size={64} active={author === a.id} />
              <span className="pick-name">{a.name}</span>
              <span className="pick-meta">{a.age} ans</span>
            </button>
          ))}
        </div>
      </section>

      <div className="shelf-wrap">
        {activeAuthor && <AuthorBio author={activeAuthor} />}
        <div className="count-line">
          {filtered.length === 0 ? "Aucune histoire trouvée…" :
            `${filtered.length} histoire${filtered.length > 1 ? "s" : ""}${query ? ` pour « ${query} »` : ""}`}
        </div>

        {filtered.length === 0 ? (
          <div className="empty">
            <div className="big">Oups, rien ici !</div>
            <div>Essaie un autre titre ou un autre auteur.</div>
          </div>
        ) : SETTINGS.homepageLayout === "shelf" ? (
          chunk(filtered, 4).map((row, i) => (
            <div key={i}>
              <div className="shelf-row">
                {row.map((b) => <BookCard key={b.id} book={b} onOpen={onOpen} showBadges={SETTINGS.showBadges} />)}
              </div>
              <div className="shelf-board" />
            </div>
          ))
        ) : grid}
      </div>
    </div>
  );
}

function App() {
  const [openBook, setOpenBook] = useState(null);

  React.useEffect(() => {
    document.documentElement.style.setProperty("--hand", `'${SETTINGS.storyFont}', cursive`);
  }, []);

  return (
    <>
      <Home onOpen={setOpenBook} />
      {openBook && (
        <Reader book={openBook} author={authorById[openBook.author]} openMode={SETTINGS.openMode} onClose={() => setOpenBook(null)} />
      )}
    </>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
