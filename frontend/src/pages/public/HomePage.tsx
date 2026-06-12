import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { thumbUrl } from "../../api/images";
import * as publicApi from "../../api/public";
import type { PublicAuthor, PublicWorkSummary } from "../../api/public";
import type { WorkSection } from "../../api/works";
import { AllAvatar, Avatar } from "../../components/Avatar";
import { CoverArt } from "../../components/CoverArt";
import { Icon } from "../../components/icons";
import { LanguageToggle } from "../../components/LanguageToggle";
import { Logo } from "../../components/Logo";
import { TopNav } from "../../components/TopNav";
import { useI18n } from "../../i18n/LanguageContext";

type SectionFilter = WorkSection | "all";

const SECTION_TABS: { value: SectionFilter; icon: keyof typeof Icon }[] = [
  { value: "all", icon: "grid" },
  { value: "book", icon: "book" },
  { value: "comic", icon: "comic" },
  { value: "drawing", icon: "art" },
  { value: "craft", icon: "craft" },
];

// Sections rendered as a square-thumbnail gallery rather than book covers.
const GALLERY_SECTIONS: ReadonlySet<SectionFilter> = new Set(["drawing", "craft"]);

function BookCard({ work }: { work: PublicWorkSummary }) {
  const effectiveCover =
    work.cover_variant === "enhanced" && work.enhanced_cover_path != null
      ? work.enhanced_cover_path
      : work.cover_variant === "restyled" && work.restyled_cover_path != null
        ? work.restyled_cover_path
        : (work.cover_path ?? work.first_page_path);
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
            cover_path: thumbUrl(effectiveCover),
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
  const { t } = useI18n();
  const src = thumbUrl(work.first_page_path ?? work.cover_path);
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
        <div className="author">
          {t("work.by", { name: work.author_display_name ?? work.author_username })}
        </div>
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
  const { t, countWorks } = useI18n();
  return (
    <div
      className="bio-card"
      style={{ boxShadow: `5px 6px 0 ${author.color ?? "#8c5bd0"}` }}
    >
      <Avatar author={author} size={90} />
      <div className="bio-text">
        <h2>{author.display_name ?? author.username}</h2>
        <div className="bio-meta">
          {author.age != null ? `${t("author.years", { n: author.age })} · ` : ""}
          {countWorks(workCount)}
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
  const { t, countWorks } = useI18n();
  const [section, setSection] = useState<SectionFilter>("all");
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
      .listWorks(section === "all" ? {} : { section })
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

  return (
    <div className="lisons-public home-shell">
      <header className="site-header">
        <Logo
          onClick={() => {
            setSection("all");
            setAuthorFilter("all");
            setQuery("");
          }}
        />
        <label className="search">
          <Icon.search size={18} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("search.placeholder")}
          />
        </label>
        <LanguageToggle />
      </header>

      <TopNav home />

      <div className="home-layout app-bg">
        <aside className="section-panel">
          <div className="panel-label">{t("nav.sections")}</div>
          <nav className="section-nav">
            {SECTION_TABS.map((tab) => {
              const IconCmp = Icon[tab.icon];
              return (
                <button
                  key={tab.value}
                  className={`section-link ${section === tab.value ? "active" : ""}`}
                  onClick={() => {
                    setSection(tab.value);
                    setAuthorFilter("all");
                  }}
                >
                  <span className="section-link-icon">
                    <IconCmp size={20} />
                  </span>
                  {t(`section.${tab.value}.label`)}
                </button>
              );
            })}
          </nav>
        </aside>

        <main className="home-main">
          <div className="main-head">
            <section className="author-bar">
              <div className="filter-label">{t("author.choose")}</div>
              <div className="author-filter">
                <button className="author-pick" onClick={() => setAuthorFilter("all")}>
                  <AllAvatar size={80} active={authorFilter === "all"} />
                  <span className="pick-name">{t("author.everyone")}</span>
                  <span className="pick-meta">{countWorks(works.length)}</span>
                </button>
                {authors.map((a) => (
                  <button
                    key={a.username}
                    className="author-pick"
                    onClick={() => setAuthorFilter(a.username)}
                  >
                    <Avatar author={a} size={80} active={authorFilter === a.username} />
                    <span className="pick-name">{a.display_name ?? a.username}</span>
                    <span className="pick-meta">
                      {a.age != null ? t("author.years", { n: a.age }) : t("author.unknownAge")}
                    </span>
                  </button>
                ))}
              </div>
            </section>

            {activeAuthor ? (
              <AuthorBio author={activeAuthor} workCount={activeAuthorWorkCount} />
            ) : (
              <div className="section-heading">
                <h1>{t(`section.${section}.h1`)}</h1>
                <p>{t(`section.${section}.sub`)}</p>
              </div>
            )}

            <div className="count-line">
              {loadingWorks
                ? t("count.loading")
                : filtered.length === 0
                  ? t("count.none")
                  : `${countWorks(filtered.length)}${query ? t("count.forQuery", { q: query }) : ""}`}
            </div>
          </div>

          <div className="shelf-scroll">
            {!loadingWorks && filtered.length === 0 ? (
              <div className="empty">
                <div className="big">{t("empty.title")}</div>
                <div>{t("empty.sub")}</div>
              </div>
            ) : GALLERY_SECTIONS.has(section) ? (
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
        </main>
      </div>
    </div>
  );
}
