import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import * as publicApi from "../../api/public";
import type { PublicAuthor, PublicWorkSummary } from "../../api/public";
import type { WorkSection } from "../../api/works";
import { AllAvatar, Avatar } from "../../components/Avatar";
import { CoverArt } from "../../components/CoverArt";
import { Icon } from "../../components/icons";
import { Logo } from "../../components/Logo";

const SECTION_TABS: { value: WorkSection; label: string }[] = [
  { value: "book", label: "Livres" },
  { value: "comic", label: "Bandes dessinées" },
  { value: "drawing", label: "Dessins" },
];

const SECTION_TITLES: Record<WorkSection, { h1: string; sub: string }> = {
  book: {
    h1: "La bibliothèque de la maison",
    sub: "Des histoires écrites, dessinées et inventées à la maison.",
  },
  comic: {
    h1: "Les bandes dessinées de la maison",
    sub: "Cases, bulles, et bruits d'animaux.",
  },
  drawing: {
    h1: "La galerie de la maison",
    sub: "Tous les dessins faits à la main.",
  },
};

function BookCard({ work }: { work: PublicWorkSummary }) {
  const effectiveCover =
    work.cover_variant === "enhanced" && work.enhanced_cover_path != null
      ? work.enhanced_cover_path
      : work.cover_variant === "restyled" && work.restyled_cover_path != null
        ? work.restyled_cover_path
        : work.cover_path;
  return (
    <Link
      to={`/lecture/${work.author_username}/${work.slug}`}
      className="book-card"
      style={{ textDecoration: "none", color: "inherit" }}
    >
      <div className="card-cover-frame">
        {work.is_new && <div className="new-badge">Nouveau</div>}
        <CoverArt
          work={{
            id: work.id,
            slug: work.slug,
            title: work.title,
            color: work.color,
            shape: work.shape,
            cover_path: effectiveCover,
          }}
          author={{
            username: work.author_username,
            display_name: work.author_display_name,
          }}
        />
      </div>
      <div className="card-meta">
        <div className="card-title">{work.title}</div>
        <div className="card-author">
          <span className="dot" style={{ background: work.author_color ?? "#8c5bd0" }} />
          {work.author_display_name ?? work.author_username}
        </div>
      </div>
    </Link>
  );
}

function DrawingTile({ work }: { work: PublicWorkSummary }) {
  const src = work.first_page_path ?? work.cover_path;
  return (
    <Link
      to={`/lecture/${work.author_username}/${work.slug}`}
      className="gallery-tile"
      style={{ textDecoration: "none", color: "inherit" }}
    >
      {src ? (
        <img src={src} alt={work.title} loading="lazy" />
      ) : (
        <div style={{ aspectRatio: "1 / 1", background: "var(--paper-2)" }} />
      )}
      <div className="meta">
        {work.title}
        <div className="author">par {work.author_display_name ?? work.author_username}</div>
      </div>
    </Link>
  );
}

function AuthorBio({
  author,
  workCount,
}: {
  author: PublicAuthor;
  workCount: number;
}) {
  return (
    <div
      className="bio-card"
      style={{ boxShadow: `5px 6px 0 ${author.color ?? "#8c5bd0"}` }}
    >
      <Avatar author={author} size={90} />
      <div className="bio-text">
        <h2>{author.display_name ?? author.username}</h2>
        <div className="bio-meta">
          {author.age != null ? `${author.age} ans · ` : ""}
          {workCount} {workCount > 1 ? "créations" : "création"}
        </div>
        {author.bio != null && author.bio.trim() !== "" && <p>{author.bio}</p>}
        {author.favo != null && author.favo.trim() !== "" && (
          <div className="bio-favo">« {author.favo} »</div>
        )}
      </div>
    </div>
  );
}

export function HomePage() {
  const [section, setSection] = useState<WorkSection>("book");
  const [authorFilter, setAuthorFilter] = useState<string>("all");
  const [query, setQuery] = useState("");
  const [authors, setAuthors] = useState<PublicAuthor[]>([]);
  const [works, setWorks] = useState<PublicWorkSummary[]>([]);
  const [loadingWorks, setLoadingWorks] = useState(true);

  useEffect(() => {
    publicApi.listAuthors().then(setAuthors).catch(() => setAuthors([]));
  }, []);

  useEffect(() => {
    setLoadingWorks(true);
    publicApi
      .listWorks({ section })
      .then(setWorks)
      .catch(() => setWorks([]))
      .finally(() => setLoadingWorks(false));
  }, [section]);

  const filtered = useMemo(() => {
    return works.filter((w) => {
      if (authorFilter !== "all" && w.author_username !== authorFilter) return false;
      if (query.trim() !== "" && !w.title.toLowerCase().includes(query.trim().toLowerCase())) {
        return false;
      }
      return true;
    });
  }, [works, authorFilter, query]);

  const activeAuthor =
    authorFilter !== "all" ? authors.find((a) => a.username === authorFilter) ?? null : null;
  const activeAuthorWorkCount = activeAuthor
    ? works.filter((w) => w.author_username === activeAuthor.username).length
    : 0;

  const titles = SECTION_TITLES[section];

  return (
    <div className="lisons-public">
      <div className="app-bg">
        <header className="site-header">
          <Logo
            onClick={() => {
              setAuthorFilter("all");
              setQuery("");
            }}
          />
          <label className="search">
            <Icon.search size={20} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Chercher un titre…"
            />
          </label>
        </header>

        <div className="section-tabs">
          {SECTION_TABS.map((t) => (
            <button
              key={t.value}
              className={`section-tab ${section === t.value ? "active" : ""}`}
              onClick={() => {
                setSection(t.value);
                setAuthorFilter("all");
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        <section className="hero">
          <h1>{titles.h1}</h1>
          <p>{titles.sub}</p>
          <div className="filter-label">Choisis un auteur&nbsp;:</div>
          <div className="author-filter">
            <button className="author-pick" onClick={() => setAuthorFilter("all")}>
              <AllAvatar size={64} active={authorFilter === "all"} />
              <span className="pick-name">Tout le monde</span>
              <span className="pick-meta">
                {works.length} {works.length > 1 ? "créations" : "création"}
              </span>
            </button>
            {authors.map((a) => (
              <button
                key={a.username}
                className="author-pick"
                onClick={() => setAuthorFilter(a.username)}
              >
                <Avatar author={a} size={64} active={authorFilter === a.username} />
                <span className="pick-name">{a.display_name ?? a.username}</span>
                <span className="pick-meta">{a.age != null ? `${a.age} ans` : "—"}</span>
              </button>
            ))}
          </div>
        </section>

        <div className="shelf-wrap">
          {activeAuthor && (
            <AuthorBio author={activeAuthor} workCount={activeAuthorWorkCount} />
          )}
          <div className="count-line">
            {loadingWorks
              ? "Chargement…"
              : filtered.length === 0
                ? "Aucune création trouvée…"
                : `${filtered.length} ${filtered.length > 1 ? "créations" : "création"}${query ? ` pour « ${query} »` : ""}`}
          </div>

          {!loadingWorks && filtered.length === 0 ? (
            <div className="empty">
              <div className="big">Oups, rien ici !</div>
              <div>Essaie un autre titre ou un autre auteur.</div>
            </div>
          ) : section === "drawing" ? (
            <div className="gallery">
              {filtered.map((w) => (
                <DrawingTile key={w.id} work={w} />
              ))}
            </div>
          ) : (
            <div className="book-grid">
              {filtered.map((w) => (
                <BookCard key={w.id} work={w} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
