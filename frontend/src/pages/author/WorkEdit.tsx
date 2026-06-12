import { useCallback, useEffect, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import * as worksApi from "../../api/works";
import type {
  DigitalVariant,
  PageResponse,
  WorkDetailResponse,
  WorkResponse,
} from "../../api/works";
import { SECTION_LABELS } from "../../api/works";
import { CoverEditor } from "./CoverEditor";
import { PageEditor } from "./PageEditor";

function CoverThumb({
  label,
  src,
  pending,
  placeholder,
  onClick,
}: {
  label: string;
  src: string | null | undefined;
  pending?: boolean;
  placeholder?: string;
  onClick: () => void;
}) {
  if (src == null && !pending && placeholder == null) return null;
  return (
    <div>
      <div className="modal-image-label">{label}</div>
      <div
        className="cover thumb-with-spinner"
        style={{
          width: 120,
          backgroundImage: src ? `url(${src})` : undefined,
          cursor: "pointer",
        }}
        onClick={onClick}
        role="button"
        tabIndex={0}
        title="Comparer les versions"
      >
        {src == null && placeholder != null && (
          <span style={{ color: "var(--muted)", fontSize: "0.8rem" }}>{placeholder}</span>
        )}
        {pending && (
          <div className="processing-overlay">
            <span className="spinner" />
            <span>Génération…</span>
          </div>
        )}
      </div>
    </div>
  );
}

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
  const [digitalVariant, setDigitalVariant] = useState<DigitalVariant | "">("");
  const [coverVariant, setCoverVariant] = useState<DigitalVariant | "">("");
  const [savingMeta, setSavingMeta] = useState(false);
  const [savingCoverVariant, setSavingCoverVariant] = useState(false);
  const [metaMsg, setMetaMsg] = useState<string | null>(null);

  const [uploading, setUploading] = useState(false);
  const [coverUploading, setCoverUploading] = useState(false);

  const [editingPageId, setEditingPageId] = useState<number | null>(null);
  const [editingCover, setEditingCover] = useState(false);

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
      setDigitalVariant(w.digital_variant ?? "");
      setCoverVariant(w.cover_variant ?? "");
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

  // Poll every 4s while any AI op is pending so spinners/banner stay accurate
  // without manual refresh.
  const pendingCount =
    (work == null
      ? 0
      : (work.cover_enhance_pending ? 1 : 0) +
        (work.cover_restyle_pending ? 1 : 0) +
        work.pages.reduce(
          (n, p) => n + (p.enhance_pending ? 1 : 0) + (p.transcribe_pending ? 1 : 0),
          0,
        ));
  useEffect(() => {
    if (pendingCount === 0) return;
    const t = setInterval(() => {
      void reload();
    }, 4000);
    return () => clearInterval(t);
  }, [pendingCount, reload]);

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
        digital_variant: digitalVariant === "" ? null : digitalVariant,
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

  async function onSaveCoverVariant(next: DigitalVariant | "") {
    if (work == null) return;
    setCoverVariant(next);
    setSavingCoverVariant(true);
    try {
      await worksApi.updateWork(work.id, { cover_variant: next === "" ? null : next });
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setSavingCoverVariant(false);
    }
  }

  async function onSaveDigitalVariant(next: DigitalVariant | "") {
    if (work == null) return;
    setDigitalVariant(next);
    try {
      await worksApi.updateWork(work.id, { digital_variant: next === "" ? null : next });
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    }
  }

  async function onPagesChange(e: ChangeEvent<HTMLInputElement>) {
    const list = e.target.files;
    e.target.value = "";
    if (list == null || work == null) return;
    const arr = Array.from(list);
    if (
      (work.section === "drawing" || work.section === "craft") &&
      (arr.length !== 1 || work.pages.length >= 1)
    ) {
      setError("Ce type de création contient une seule image.");
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

  async function splitAtPage(page: PageResponse) {
    if (work == null) return;
    const title = window.prompt(
      `Découper "${work.title}" à partir de la page ${page.idx}. Titre de la nouvelle œuvre (laisser vide pour "${work.title} (suite)") :`,
      "",
    );
    if (title === null) return; // cancelled
    try {
      const newWork = await worksApi.splitWorkAtPage(work.id, page.id, title);
      navigate(`/me/works/${newWork.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    }
  }

  async function movePageToOtherWork(page: PageResponse) {
    if (work == null) return;
    const dstStr = window.prompt(
      `Déplacer la page ${page.idx} vers une autre œuvre (même section). Entre l'ID de l'œuvre destination :`,
      "",
    );
    if (dstStr == null) return;
    const dst = Number(dstStr);
    if (!Number.isFinite(dst) || dst <= 0) {
      setError("ID d'œuvre invalide.");
      return;
    }
    try {
      await worksApi.movePage(work.id, page.id, dst);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    }
  }

  function onPageUpdated(updated: PageResponse) {
    if (work == null) return;
    setWork({
      ...work,
      pages: work.pages.map((p) => (p.id === updated.id ? updated : p)),
    });
  }

  function onWorkUpdated(updated: WorkResponse) {
    if (work == null) return;
    setWork({ ...work, ...updated });
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
  // Single-image mode: drawings and crafts hold exactly one image.
  const drawingMode = work.section === "drawing" || work.section === "craft";
  const editingPage = editingPageId == null ? null : work.pages.find((p) => p.id === editingPageId) ?? null;

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

      {pendingCount > 0 && (
        <div className="processing-banner" style={{ marginBottom: "1rem" }}>
          <span className="spinner" />
          ✨ {pendingCount} tâche{pendingCount > 1 ? "s" : ""} en cours — mises à jour automatiques
        </div>
      )}

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

          {!drawingMode && (
            <div>
              <div style={{ color: "var(--muted)", fontSize: "0.9rem", marginBottom: "0.25rem" }}>
                Version numérique à montrer aux lecteurs
              </div>
              <div className="variant-toggle">
                <label>
                  <input
                    type="radio"
                    name="digital_variant"
                    checked={digitalVariant === ""}
                    onChange={() => setDigitalVariant("")}
                  />
                  Aucune (juste les scans)
                </label>
                <label>
                  <input
                    type="radio"
                    name="digital_variant"
                    checked={digitalVariant === "enhanced"}
                    onChange={() => setDigitalVariant("enhanced")}
                  />
                  ✨ Améliorée
                </label>
                <label>
                  <input
                    type="radio"
                    name="digital_variant"
                    checked={digitalVariant === "restyled"}
                    onChange={() => setDigitalVariant("restyled")}
                  />
                  🎨 Redessinée
                </label>
              </div>
            </div>
          )}

          {metaMsg != null && <div style={{ color: "var(--muted)" }}>{metaMsg}</div>}
          <button type="submit" disabled={savingMeta}>
            {savingMeta ? "Enregistrement…" : "Enregistrer"}
          </button>
        </form>
      </section>

      {!drawingMode && (
        <section className="card stack" style={{ marginBottom: "1rem" }}>
          <h2 style={{ margin: 0, fontSize: "1.1rem" }}>Couverture</h2>
          <div className="row" style={{ alignItems: "flex-start", flexWrap: "wrap", gap: "1rem" }}>
            <CoverThumb
              label="Original"
              src={work.cover_path}
              onClick={() => setEditingCover(true)}
              placeholder="Aucune"
            />
            <CoverThumb
              label="✨ Améliorée"
              src={work.enhanced_cover_path}
              pending={work.cover_enhance_pending}
              onClick={() => setEditingCover(true)}
            />
            <CoverThumb
              label="🎨 Redessinée"
              src={work.restyled_cover_path}
              pending={work.cover_restyle_pending}
              onClick={() => setEditingCover(true)}
            />
            <div className="stack" style={{ minWidth: 200 }}>
              <label
                className="ghost-link"
                style={{ cursor: "pointer", border: "1px solid var(--border)", textAlign: "center" }}
              >
                {coverUploading ? "Envoi…" : "Changer la couverture"}
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  onChange={(e) => void onCoverChange(e)}
                  style={{ display: "none" }}
                />
              </label>
              <div style={{ color: "var(--muted)", fontSize: "0.9rem", marginTop: "0.5rem" }}>
                Quelle version montrer sur le site
              </div>
              <div className="variant-toggle">
                <label>
                  <input
                    type="radio"
                    name="cover_variant"
                    checked={coverVariant === ""}
                    disabled={savingCoverVariant}
                    onChange={() => void onSaveCoverVariant("")}
                  />
                  Original
                </label>
                <label>
                  <input
                    type="radio"
                    name="cover_variant"
                    checked={coverVariant === "enhanced"}
                    disabled={savingCoverVariant || work.enhanced_cover_path == null}
                    onChange={() => void onSaveCoverVariant("enhanced")}
                  />
                  ✨ Améliorée
                </label>
                <label>
                  <input
                    type="radio"
                    name="cover_variant"
                    checked={coverVariant === "restyled"}
                    disabled={savingCoverVariant || work.restyled_cover_path == null}
                    onChange={() => void onSaveCoverVariant("restyled")}
                  />
                  🎨 Redessinée
                </label>
              </div>
            </div>
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

        {drawingMode && sortedPages.length > 0 && (
          <div>
            <div style={{ color: "var(--muted)", fontSize: "0.9rem", marginBottom: "0.25rem" }}>
              Version à montrer sur le site
            </div>
            <div className="variant-toggle">
              <label>
                <input
                  type="radio"
                  name="drawing_variant"
                  checked={digitalVariant === ""}
                  onChange={() => void onSaveDigitalVariant("")}
                />
                Original (scan)
              </label>
              <label>
                <input
                  type="radio"
                  name="drawing_variant"
                  checked={digitalVariant === "enhanced"}
                  disabled={sortedPages[0].enhanced_path == null}
                  onChange={() => void onSaveDigitalVariant("enhanced")}
                />
                ✨ Améliorée
              </label>
            </div>
            {sortedPages[0].enhanced_path == null && (
              <div style={{ color: "var(--muted)", fontSize: "0.8rem", marginTop: "0.25rem" }}>
                {sortedPages[0].enhance_pending
                  ? "Version améliorée en cours de génération…"
                  : "Pas encore de version améliorée — utilise « Améliorer l'image » dans l'éditeur."}
              </div>
            )}
          </div>
        )}

        {sortedPages.length === 0 ? (
          <p style={{ color: "var(--muted)", margin: 0 }}>Aucune page pour le moment.</p>
        ) : (
          <div className="page-list">
            {sortedPages.map((p, i) => {
              const pagePending = p.enhance_pending || p.transcribe_pending;
              return (
                <div
                  key={p.id}
                  className="page-thumb thumb-with-spinner"
                  style={{ backgroundImage: p.scan_path ? `url(${p.scan_path})` : undefined }}
                  onClick={() => setEditingPageId(p.id)}
                  role="button"
                  tabIndex={0}
                >
                  <span className="badge">{p.idx}</span>
                  {pagePending && (
                    <div className="processing-overlay">
                      <span className="spinner" />
                      <span>
                        {p.enhance_pending && p.transcribe_pending
                          ? "Image + texte…"
                          : p.enhance_pending
                            ? "Image…"
                            : "Texte…"}
                      </span>
                    </div>
                  )}
                  <div className="actions" onClick={(e) => e.stopPropagation()}>
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
                        <button title="Découper en nouvelle œuvre" onClick={() => void splitAtPage(p)}>
                          ✂
                        </button>
                        <button title="Déplacer vers une autre œuvre" onClick={() => void movePageToOtherWork(p)}>
                          ↔
                        </button>
                      </>
                    )}
                    <button title="Éditer" onClick={() => setEditingPageId(p.id)}>
                      ✎
                    </button>
                    <button title="Supprimer" onClick={() => void deletePage(p)}>
                      ✕
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {editingPage != null && (
        <PageEditor
          workId={work.id}
          page={editingPage}
          drawingMode={drawingMode}
          onClose={() => setEditingPageId(null)}
          onChange={onPageUpdated}
        />
      )}

      {editingCover && (
        <CoverEditor
          work={work}
          onClose={() => setEditingCover(false)}
          onChange={onWorkUpdated}
        />
      )}
    </main>
  );
}
