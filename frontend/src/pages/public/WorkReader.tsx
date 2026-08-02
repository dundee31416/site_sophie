import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import * as publicApi from "../../api/public";
import type { PublicWorkDetail } from "../../api/public";
import type { PageResponse } from "../../api/works";
import { Icon } from "../../components/icons";
import { useI18n } from "../../i18n/LanguageContext";

type Mode = "digital" | "scan";
type VariantField = "enhanced_path" | "restyled_path" | null;

const SPREAD_BREAKPOINT = 1100;
const DOTS_MAX = 8;

function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return false;
    }
    return window.matchMedia(query).matches;
  });
  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const mql = window.matchMedia(query);
    const onChange = (e: MediaQueryListEvent) => setMatches(e.matches);
    setMatches(mql.matches);
    if (typeof mql.addEventListener === "function") {
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    }
    // Safari < 14 fallback
    mql.addListener(onChange);
    return () => mql.removeListener(onChange);
  }, [query]);
  return matches;
}

function renderDigital(
  page: PageResponse,
  workTitle: string,
  pageIdx: number,
  variantField: VariantField,
  section: string,
  emptyLabel: string,
) {
  // Legacy: an HTML file already laid out as a page.
  if (page.html_path != null) {
    return (
      <iframe
        className="html-page"
        src={page.html_path}
        title={`${workTitle} — page ${pageIdx + 1}`}
        sandbox="allow-same-origin allow-scripts"
      />
    );
  }

  const variantSrc = variantField != null ? page[variantField] : null;
  // Books are text-first in digital mode: the scan lives under the "Original"
  // toggle. Comics/drawings/crafts still need the image.
  const imageSrc = section === "book" ? null : (variantSrc ?? page.scan_path);
  const text = page.text;

  return (
    <div className="digital-page">
      {imageSrc != null && (
        <img
          className="digital-image"
          src={imageSrc}
          alt={`${workTitle} — page ${pageIdx + 1}`}
        />
      )}
      {text != null && text !== "" && (
        <div className="digital-text">
          {text.split(/\n\s*\n/).map((para, i) => (
            <p key={i}>
              {para.split("\n").map((line, j, lines) => (
                <span key={j}>
                  {line}
                  {j < lines.length - 1 && <br />}
                </span>
              ))}
            </p>
          ))}
        </div>
      )}
      {imageSrc == null && (text == null || text === "") && (
        <p style={{ padding: 30 }}>{page.illo_label ?? emptyLabel}</p>
      )}
    </div>
  );
}

function renderScan(page: PageResponse, workTitle: string, pageIdx: number, emptyLabel: string) {
  if (page.scan_path != null) {
    return (
      <div className="scan-slot">
        <div className="scan-tape scan-tape-l" />
        <div className="scan-tape scan-tape-r" />
        <img
          className="scan-image"
          src={page.scan_path}
          alt={`${workTitle} — page ${pageIdx + 1}`}
        />
      </div>
    );
  }
  return (
    <div className="scan-slot">
      <div className="scan-tape scan-tape-l" />
      <div className="scan-tape scan-tape-r" />
      <p style={{ padding: 30 }}>{page.illo_label ?? emptyLabel}</p>
    </div>
  );
}

export function WorkReader() {
  const { t } = useI18n();
  const { author, slug } = useParams<{ author: string; slug: string }>();
  const navigate = useNavigate();

  const [work, setWork] = useState<PublicWorkDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pageIdx, setPageIdx] = useState(0);
  const [mode, setMode] = useState<Mode>("digital");
  const [dir, setDir] = useState<1 | -1>(1);

  const isWide = useMediaQuery(`(min-width: ${SPREAD_BREAKPOINT}px)`);

  useEffect(() => {
    if (author == null || slug == null) return;
    publicApi
      .getWork(author, slug)
      .then((w) => {
        setWork(w);
        setError(null);
        setPageIdx(0);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Erreur");
      });
  }, [author, slug]);

  const total = work?.pages.length ?? 0;
  const hasAnyHtml = work?.pages.some((p) => p.html_path != null) ?? false;
  const hasAnyText = work?.pages.some((p) => p.text != null && p.text !== "") ?? false;
  const variantField =
    work?.digital_variant === "enhanced"
      ? "enhanced_path"
      : work?.digital_variant === "restyled"
        ? "restyled_path"
        : null;
  const hasAnyVariantImage =
    variantField != null && (work?.pages.some((p) => p[variantField] != null) ?? false);
  // Books hide their scan in digital mode (text-first), so a book without any
  // text has no digital content to show — the toggle would land on a blank page.
  const isBook = work?.section === "book";
  const hasDigitalContent = hasAnyHtml || hasAnyText || (!isBook && hasAnyVariantImage);

  const isPaginated = work?.section === "book" || work?.section === "comic";
  // Two-page spread on wide screens for multi-page books/comics.
  // Legacy html_path pages opt out (their iframes don't pair cleanly).
  const spread = isPaginated && isWide && total > 1 && !hasAnyHtml;
  const step = spread ? 2 : 1;

  // When spread mode toggles on, snap to an even page index so the spread is aligned.
  useEffect(() => {
    if (spread && pageIdx % 2 === 1) {
      setPageIdx((p) => p - 1);
    }
  }, [spread, pageIdx]);

  const go = useCallback(
    (d: 1 | -1) => {
      setPageIdx((p) => {
        const target = p + d * step;
        const n = Math.min(total - 1, Math.max(0, target));
        if (n !== p) setDir(d);
        return n;
      });
    },
    [total, step],
  );

  const jumpTo = useCallback(
    (idx: number) => {
      const snapped = spread ? idx - (idx % 2) : idx;
      const clamped = Math.min(total - 1, Math.max(0, snapped));
      setDir(clamped > pageIdx ? 1 : -1);
      setPageIdx(clamped);
    },
    [spread, total, pageIdx],
  );

  const close = useCallback(() => navigate("/"), [navigate]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowRight") go(1);
      else if (e.key === "ArrowLeft") go(-1);
      else if (e.key === "Escape") close();
      else if (e.key.toLowerCase() === "o") setMode("scan");
      else if (e.key.toLowerCase() === "n") setMode("digital");
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, close]);

  const progress = useMemo(() => {
    if (total <= 1) return 0;
    const rightShown = spread && pageIdx + 1 < total ? pageIdx + 1 : pageIdx;
    return ((rightShown + 1) / total) * 100;
  }, [total, pageIdx, spread]);

  if (error != null) {
    return (
      <div className="lisons-public">
        <div className="reader">
          <div className="reader-bar">
            <button className="btn-back" onClick={close}>
              <Icon.back /> {t("reader.shelf")}
            </button>
          </div>
          <main style={{ padding: 30 }}>
            <h1>{t("reader.notFound")}</h1>
            <p>{error}</p>
          </main>
        </div>
      </div>
    );
  }

  if (work == null) {
    return (
      <div className="lisons-public">
        <div className="reader">
          <main style={{ padding: 30 }}>{t("reader.loading")}</main>
        </div>
      </div>
    );
  }

  // Drawings & crafts: single-image fullscreen view, no pagination, no toggle.
  if (work.section === "drawing" || work.section === "craft") {
    const firstPage = work.pages[0];
    const img =
      work.digital_variant === "enhanced" && firstPage?.enhanced_path != null
        ? firstPage.enhanced_path
        : (firstPage?.scan_path ?? work.cover_path);
    return (
      <div className="lisons-public">
        <div className="reader">
          <div className="reader-bar">
            <button className="btn-back" onClick={close}>
              <Icon.back /> {t("reader.shelf")}
            </button>
            <div className="reader-titles">
              <div className="rt-title">{work.title}</div>
              <div className="rt-author">
                {t("work.by", { name: work.author_display_name ?? work.author_username })}
                {work.author_age != null ? t("reader.ageSuffix", { n: work.author_age }) : ""}
              </div>
            </div>
            <span className="reader-bar-end" />
          </div>
          <div className="drawing-fullscreen">
            {img ? <img src={img} alt={work.title} /> : <p>{t("reader.noImage")}</p>}
          </div>
        </div>
      </div>
    );
  }

  const leftIdx = pageIdx;
  const rightIdx = pageIdx + 1;
  const leftPage = work.pages[leftIdx];
  const rightPage = rightIdx < total ? work.pages[rightIdx] : null;

  function renderPage(p: PageResponse | undefined | null, idx: number) {
    if (p == null) return <div className="page-blank" />;
    if (mode === "digital") {
      return renderDigital(p, work!.title, idx, variantField, work!.section, t("reader.emptyPage"));
    }
    return renderScan(p, work!.title, idx, t("reader.emptyPage"));
  }

  const atStart = pageIdx === 0;
  const atEnd = spread ? pageIdx + step >= total : pageIdx >= total - 1;

  return (
    <div className="lisons-public">
      <div className="reader">
        <div className="reader-bar">
          <button className="btn-back" onClick={close}>
            <Icon.back /> {t("reader.shelf")}
          </button>
          <div className="reader-titles">
            <div className="rt-title">{work.title}</div>
            <div className="rt-author">
              {t("work.by", { name: work.author_display_name ?? work.author_username })}
              {work.author_age != null ? t("reader.ageSuffix", { n: work.author_age }) : ""}
            </div>
          </div>
          {hasDigitalContent ? (
            <div className="mode-toggle" data-mode={mode}>
              <span
                className="mode-pill"
                style={{ background: work.color ?? "var(--pub-ink)" }}
              />
              <button
                className={mode === "digital" ? "on" : ""}
                onClick={() => setMode("digital")}
              >
                <Icon.book size={17} /> {t("reader.digital")}
              </button>
              <button
                className={mode === "scan" ? "on" : ""}
                onClick={() => setMode("scan")}
              >
                <Icon.scan size={17} /> {t("reader.original")}
              </button>
            </div>
          ) : (
            <span className="reader-bar-end" />
          )}
        </div>

        <div className="reader-stage">
          <button
            className="nav-arrow nav-arrow-prev"
            onClick={() => go(-1)}
            disabled={atStart}
            aria-label={t("reader.prevPage")}
          >
            <Icon.arrowL />
          </button>

          <div className={`page-frame ${spread ? "spread" : ""}`}>
            {spread ? (
              <div
                key={`spread-${mode}-${leftIdx}`}
                className={`page-pair ${dir > 0 ? "page-flip-enter" : "page-flip-back"}`}
              >
                <div className="page-side page-side-l">{renderPage(leftPage, leftIdx)}</div>
                <div className="page-side page-side-r">{renderPage(rightPage, rightIdx)}</div>
                <div className="page-gutter" aria-hidden />
              </div>
            ) : (
              <div
                key={`${mode}-${pageIdx}`}
                className={`page-inner ${dir > 0 ? "page-flip-enter" : "page-flip-back"}`}
              >
                {leftPage == null ? <p>{t("reader.noPage")}</p> : renderPage(leftPage, leftIdx)}
              </div>
            )}
          </div>

          <button
            className="nav-arrow nav-arrow-next"
            onClick={() => go(1)}
            disabled={atEnd}
            aria-label={t("reader.nextPage")}
          >
            <Icon.arrowR />
          </button>
        </div>

        <div className="dots-row">
          <span className="page-counter">
            {spread && rightPage != null
              ? `${leftIdx + 1}–${rightIdx + 1} / ${total}`
              : t("reader.page", { n: pageIdx + 1, total })}
          </span>
          {total <= DOTS_MAX ? (
            <span className="dots-track">
              {work.pages.map((_, i) => (
                <button
                  key={i}
                  className={`pdot ${i === pageIdx || (spread && i === rightIdx) ? "cur" : i < pageIdx ? "done" : ""}`}
                  onClick={() => jumpTo(i)}
                  aria-label={t("reader.pageN", { n: i + 1 })}
                />
              ))}
            </span>
          ) : (
            <div
              className="progress-track"
              role="slider"
              aria-valuemin={1}
              aria-valuemax={total}
              aria-valuenow={pageIdx + 1}
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                jumpTo(Math.floor(ratio * total));
              }}
            >
              <div className="progress-fill" style={{ width: `${progress}%` }} />
              <div
                className="progress-thumb"
                style={{ left: `${progress}%` }}
                aria-hidden
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
