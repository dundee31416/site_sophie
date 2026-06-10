import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import * as publicApi from "../../api/public";
import type { PublicWorkDetail } from "../../api/public";
import type { PageResponse } from "../../api/works";
import { Icon } from "../../components/icons";

type Mode = "digital" | "scan";
type VariantField = "enhanced_path" | "restyled_path" | null;

function renderDigital(
  page: PageResponse,
  workTitle: string,
  pageIdx: number,
  variantField: VariantField,
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
  const imageSrc = variantSrc ?? page.scan_path;
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
        <p style={{ padding: 30 }}>{page.illo_label ?? "(page vide)"}</p>
      )}
    </div>
  );
}

export function WorkReader() {
  const { author, slug } = useParams<{ author: string; slug: string }>();
  const navigate = useNavigate();

  const [work, setWork] = useState<PublicWorkDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pageIdx, setPageIdx] = useState(0);
  const [mode, setMode] = useState<Mode>("digital");
  const [dir, setDir] = useState<1 | -1>(1);

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
  const hasDigitalContent = hasAnyHtml || hasAnyText || hasAnyVariantImage;

  const go = useCallback(
    (d: 1 | -1) => {
      setPageIdx((p) => {
        const n = Math.min(total - 1, Math.max(0, p + d));
        if (n !== p) setDir(d);
        return n;
      });
    },
    [total],
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

  if (error != null) {
    return (
      <div className="lisons-public">
        <div className="reader">
          <div className="reader-bar">
            <button className="btn-back" onClick={close}>
              <Icon.back /> Étagère
            </button>
          </div>
          <main style={{ padding: 30 }}>
            <h1>Œuvre introuvable</h1>
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
          <main style={{ padding: 30 }}>Chargement…</main>
        </div>
      </div>
    );
  }

  // Drawings: single-image fullscreen view, no pagination, no mode toggle.
  if (work.section === "drawing") {
    const img = work.pages[0]?.scan_path ?? work.cover_path;
    return (
      <div className="lisons-public">
        <div className="reader">
          <div className="reader-bar">
            <button className="btn-back" onClick={close}>
              <Icon.back /> Étagère
            </button>
            <div className="reader-titles">
              <div className="rt-title">{work.title}</div>
              <div className="rt-author">
                par {work.author_display_name ?? work.author_username}
                {work.author_age != null ? `, ${work.author_age} ans` : ""}
              </div>
            </div>
          </div>
          <div className="drawing-fullscreen">
            {img ? <img src={img} alt={work.title} /> : <p>Aucune image.</p>}
          </div>
        </div>
      </div>
    );
  }

  const page = work.pages[pageIdx];

  return (
    <div className="lisons-public">
      <div className="reader">
        <div className="reader-bar">
          <button className="btn-back" onClick={close}>
            <Icon.back /> Étagère
          </button>
          <div className="reader-titles">
            <div className="rt-title">{work.title}</div>
            <div className="rt-author">
              par {work.author_display_name ?? work.author_username}
              {work.author_age != null ? `, ${work.author_age} ans` : ""}
            </div>
          </div>
          {hasDigitalContent && (
            <div className="mode-toggle" data-mode={mode}>
              <span
                className="mode-pill"
                style={{ background: work.color ?? "var(--pub-ink)" }}
              />
              <button
                className={mode === "digital" ? "on" : ""}
                onClick={() => setMode("digital")}
              >
                <Icon.book size={17} /> Numérique
              </button>
              <button
                className={mode === "scan" ? "on" : ""}
                onClick={() => setMode("scan")}
              >
                <Icon.scan size={17} /> Original
              </button>
            </div>
          )}
        </div>

        <div className="reader-stage">
          <button
            className="nav-arrow"
            onClick={() => go(-1)}
            disabled={pageIdx === 0}
            aria-label="Page précédente"
          >
            <Icon.arrowL />
          </button>

          <div className="page-frame">
            <div
              key={`${mode}-${pageIdx}`}
              className={`page-inner ${dir > 0 ? "page-flip-enter" : "page-flip-back"}`}
            >
              {page == null ? (
                <p>Aucune page</p>
              ) : mode === "digital" ? (
                renderDigital(page, work.title, pageIdx, variantField)
              ) : page.scan_path != null ? (
                <div className="scan-slot">
                  <div className="scan-tape scan-tape-l" />
                  <div className="scan-tape scan-tape-r" />
                  <img
                    className="scan-image"
                    src={page.scan_path}
                    alt={`${work.title} — page ${pageIdx + 1}`}
                  />
                </div>
              ) : (
                <div className="scan-slot">
                  <div className="scan-tape scan-tape-l" />
                  <div className="scan-tape scan-tape-r" />
                  <p style={{ padding: 30 }}>{page.illo_label ?? "(page vide)"}</p>
                </div>
              )}
            </div>
          </div>

          <button
            className="nav-arrow"
            onClick={() => go(1)}
            disabled={pageIdx >= total - 1}
            aria-label="Page suivante"
          >
            <Icon.arrowR />
          </button>
        </div>

        <div className="dots-row">
          <span className="page-counter">
            Page {pageIdx + 1} / {total}
          </span>
          <span className="dots-track">
            {work.pages.map((_, i) => (
              <button
                key={i}
                className={`pdot ${i === pageIdx ? "cur" : i < pageIdx ? "done" : ""}`}
                onClick={() => {
                  setDir(i > pageIdx ? 1 : -1);
                  setPageIdx(i);
                }}
                aria-label={`Page ${i + 1}`}
              />
            ))}
          </span>
        </div>
      </div>
    </div>
  );
}
