import { useCallback, useEffect, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import * as worksApi from "../../api/works";
import type { PageResponse, WorkDetailResponse } from "../../api/works";
import { SECTION_LABELS } from "../../api/works";

export function WorkEdit() {
  const { id: idParam } = useParams<{ id: string }>();
  const workId = Number(idParam);
  const navigate = useNavigate();

  const [work, setWork] = useState<WorkDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [blurb, setBlurb] = useState("");
  const [year, setYear] = useState("");
  const [isNew, setIsNew] = useState(false);
  const [savingMeta, setSavingMeta] = useState(false);
  const [metaMsg, setMetaMsg] = useState<string | null>(null);

  const [uploading, setUploading] = useState(false);
  const [coverUploading, setCoverUploading] = useState(false);

  const reload = useCallback(async () => {
    if (!Number.isFinite(workId)) return;
    setLoading(true);
    try {
      const w = await worksApi.getWork(workId);
      setWork(w);
      setTitle(w.title);
      setBlurb(w.blurb ?? "");
      setYear(w.year != null ? String(w.year) : "");
      setIsNew(w.is_new);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setLoading(false);
    }
  }, [workId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  async function onSaveMeta(e: FormEvent) {
    e.preventDefault();
    setSavingMeta(true);
    setMetaMsg(null);
    try {
      await worksApi.updateWork(workId, {
        title: title.trim(),
        blurb: blurb.trim() || null,
        year: year.trim() === "" ? null : Number(year),
        is_new: isNew,
      });
      setMetaMsg("Enregistré.");
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setSavingMeta(false);
    }
  }

  async function onCoverChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file == null || work == null) return;
    setCoverUploading(true);
    try {
      await worksApi.uploadCover(work.id, file);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setCoverUploading(false);
    }
  }

  async function onPagesChange(e: ChangeEvent<HTMLInputElement>) {
    const list = e.target.files;
    e.target.value = "";
    if (list == null || work == null) return;
    const arr = Array.from(list);
    if (work.section === "drawing" && (arr.length !== 1 || work.pages.length >= 1)) {
      setError("Un dessin contient une seule image.");
      return;
    }
    setUploading(true);
    try {
      await worksApi.uploadPages(work.id, arr);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setUploading(false);
    }
  }

  async function movePage(page: PageResponse, direction: -1 | 1) {
    if (work == null) return;
    const sorted = [...work.pages].sort((a, b) => a.idx - b.idx);
    const idx = sorted.findIndex((p) => p.id === page.id);
    const swap = idx + direction;
    if (swap < 0 || swap >= sorted.length) return;
    const newOrder = [...sorted];
    [newOrder[idx], newOrder[swap]] = [newOrder[swap], newOrder[idx]];
    try {
      await worksApi.reorderPages(
        work.id,
        newOrder.map((p) => p.id),
      );
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    }
  }

  async function deletePage(page: PageResponse) {
    if (work == null) return;
    if (!window.confirm(`Supprimer la page ${page.idx} ?`)) return;
    try {
      await worksApi.deletePage(work.id, page.id);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    }
  }

  async function deleteWholeWork() {
    if (work == null) return;
    if (!window.confirm(`Supprimer "${work.title}" et toutes ses pages ?`)) return;
    try {
      await worksApi.deleteWork(work.id);
      navigate("/me/dashboard", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    }
  }

  if (loading && work == null) return <main><p>Chargement…</p></main>;
  if (work == null) {
    return (
      <main>
        <p>Œuvre introuvable.</p>
        <Link to="/me/dashboard">← Tableau de bord</Link>
      </main>
    );
  }

  const sortedPages = [...work.pages].sort((a, b) => a.idx - b.idx);
  const drawingMode = work.section === "drawing";

  return (
    <main>
      <div className="row" style={{ justifyContent: "space-between", marginBottom: "1rem" }}>
        <div>
          <Link to="/me/dashboard" className="ghost-link">
            ← Tableau de bord
          </Link>
          <h1 style={{ margin: "0.5rem 0 0" }}>
            {work.title}{" "}
            <span style={{ color: "var(--muted)", fontSize: "0.6em" }}>
              · {SECTION_LABELS[work.section]}
            </span>
          </h1>
        </div>
        <button className="danger" onClick={() => void deleteWholeWork()}>
          Supprimer
        </button>
      </div>

      {error != null && <div className="error" style={{ marginBottom: "1rem" }}>{error}</div>}

      <section className="card stack" style={{ marginBottom: "1rem" }}>
        <h2 style={{ margin: 0, fontSize: "1.1rem" }}>Détails</h2>
        <form onSubmit={onSaveMeta} className="stack">
          <label>
            Titre
            <input value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={256} />
          </label>
          <label>
            Résumé
            <textarea
              rows={3}
              value={blurb}
              onChange={(e) => setBlurb(e.target.value)}
              maxLength={2000}
            />
          </label>
          <div className="row">
            <label style={{ maxWidth: 160 }}>
              Année
              <input
                type="number"
                min={1900}
                max={2200}
                value={year}
                onChange={(e) => setYear(e.target.value)}
              />
            </label>
            <label className="row" style={{ alignItems: "center", marginTop: "1.4rem" }}>
              <input
                type="checkbox"
                checked={isNew}
                onChange={(e) => setIsNew(e.target.checked)}
              />
              <span>✨ Marquer comme nouveau</span>
            </label>
          </div>
          {metaMsg != null && <div style={{ color: "var(--muted)" }}>{metaMsg}</div>}
          <button type="submit" disabled={savingMeta}>
            {savingMeta ? "Enregistrement…" : "Enregistrer"}
          </button>
        </form>
      </section>

      {!drawingMode && (
        <section className="card stack" style={{ marginBottom: "1rem" }}>
          <h2 style={{ margin: 0, fontSize: "1.1rem" }}>Couverture</h2>
          <div className="row" style={{ alignItems: "center" }}>
            <div
              className="cover"
              style={{
                width: 120,
                backgroundImage: work.cover_path ? `url(${work.cover_path})` : undefined,
              }}
            >
              {work.cover_path == null && (
                <span style={{ color: "var(--muted)", fontSize: "0.8rem" }}>Aucune</span>
              )}
            </div>
            <label
              className="ghost-link"
              style={{ cursor: "pointer", border: "1px solid var(--border)" }}
            >
              {coverUploading ? "Envoi…" : "Changer la couverture"}
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                onChange={(e) => void onCoverChange(e)}
                style={{ display: "none" }}
              />
            </label>
          </div>
        </section>
      )}

      <section className="card stack">
        <div className="row" style={{ justifyContent: "space-between" }}>
          <h2 style={{ margin: 0, fontSize: "1.1rem" }}>
            {drawingMode ? "Image" : "Pages"} ({sortedPages.length})
          </h2>
          {(!drawingMode || sortedPages.length === 0) && (
            <label
              className="ghost-link"
              style={{ cursor: "pointer", border: "1px solid var(--border)" }}
            >
              {uploading
                ? "Envoi…"
                : drawingMode
                  ? "+ Ajouter l'image"
                  : "+ Ajouter des pages"}
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                multiple={!drawingMode}
                onChange={(e) => void onPagesChange(e)}
                style={{ display: "none" }}
              />
            </label>
          )}
        </div>

        {sortedPages.length === 0 ? (
          <p style={{ color: "var(--muted)", margin: 0 }}>Aucune page pour le moment.</p>
        ) : (
          <div className="page-list">
            {sortedPages.map((p, i) => (
              <div
                key={p.id}
                className="page-thumb"
                style={{ backgroundImage: p.scan_path ? `url(${p.scan_path})` : undefined }}
              >
                <span className="badge">{p.idx}</span>
                <div className="actions">
                  {!drawingMode && (
                    <>
                      <button
                        title="Reculer"
                        disabled={i === 0}
                        onClick={() => void movePage(p, -1)}
                      >
                        ◀
                      </button>
                      <button
                        title="Avancer"
                        disabled={i === sortedPages.length - 1}
                        onClick={() => void movePage(p, 1)}
                      >
                        ▶
                      </button>
                    </>
                  )}
                  <button title="Supprimer" onClick={() => void deletePage(p)}>
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
