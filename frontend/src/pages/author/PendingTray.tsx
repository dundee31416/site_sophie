import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { thumbUrl } from "../../api/images";
import * as pendingApi from "../../api/pending";
import type { PendingFileResponse, PendingSection } from "../../api/pending";

const SECTION_LABELS: Record<PendingSection, { plural: string; singular: string }> = {
  book: { plural: "Livres en attente", singular: "Livre" },
  comic: { plural: "Bandes dessinées en attente", singular: "BD" },
};

export function PendingTray() {
  const navigate = useNavigate();
  const [files, setFiles] = useState<PendingFileResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [titleInput, setTitleInput] = useState("");
  const [assembling, setAssembling] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const list = await pendingApi.listPending();
      setFiles(list);
      setError(null);
      // Clean up selections referring to deleted rows.
      setSelected((cur) => {
        const next = new Set<number>();
        for (const f of list) if (cur.has(f.id)) next.add(f.id);
        return next;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
    const t = setInterval(() => void reload(), 10_000);
    return () => clearInterval(t);
  }, [reload]);

  const bySection = useMemo(() => {
    const groups: Record<PendingSection, PendingFileResponse[]> = { book: [], comic: [] };
    for (const f of files) groups[f.section].push(f);
    return groups;
  }, [files]);

  const selectedSection: PendingSection | null = useMemo(() => {
    if (selected.size === 0) return null;
    const first = files.find((f) => selected.has(f.id));
    return first?.section ?? null;
  }, [selected, files]);

  const sameSection = useMemo(() => {
    if (selectedSection == null) return true;
    return files.filter((f) => selected.has(f.id)).every((f) => f.section === selectedSection);
  }, [selected, files, selectedSection]);

  function toggle(id: number) {
    setSelected((cur) => {
      const next = new Set(cur);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function defaultTitle(section: PendingSection): string {
    const now = new Date();
    const months = [
      "janvier", "février", "mars", "avril", "mai", "juin",
      "juillet", "août", "septembre", "octobre", "novembre", "décembre",
    ];
    return `${section === "book" ? "Livre" : "BD"} du ${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`;
  }

  async function onAssemble() {
    if (selectedSection == null) return;
    if (!sameSection) {
      setError("Tous les fichiers sélectionnés doivent être de la même section.");
      return;
    }
    setAssembling(true);
    setError(null);
    try {
      // Preserve the chronological order shown in the UI for the picked files.
      const orderedIds = files.filter((f) => selected.has(f.id)).map((f) => f.id);
      const work = await pendingApi.assemblePending({
        section: selectedSection,
        title: titleInput.trim() || null,
        file_ids: orderedIds,
      });
      navigate(`/me/works/${work.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setAssembling(false);
    }
  }

  async function onDiscard(id: number) {
    if (!window.confirm("Supprimer ce fichier ?")) return;
    try {
      await pendingApi.discardPending(id);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    }
  }

  return (
    <main>
      <div className="row" style={{ justifyContent: "space-between", marginBottom: "1rem" }}>
        <h1 style={{ margin: 0 }}>À organiser</h1>
        <Link to="/me/dashboard" className="ghost-link">
          ← Tableau de bord
        </Link>
      </div>

      {error != null && <div className="error" style={{ marginBottom: "1rem" }}>{error}</div>}

      {loading && files.length === 0 ? (
        <p>Chargement…</p>
      ) : files.length === 0 ? (
        <section className="card">
          <p style={{ color: "var(--muted)", margin: 0 }}>
            Aucun fichier en attente. Scanne depuis l'imprimante vers ton dossier{" "}
            <code>livre/</code>, <code>bd/</code> ou <code>dessin/</code> — les pages apparaîtront
            ici (sauf les dessins qui sont publiés directement).
          </p>
        </section>
      ) : (
        <>
          {selected.size > 0 && (
            <section className="card stack" style={{ marginBottom: "1rem" }}>
              <h2 style={{ margin: 0, fontSize: "1.1rem" }}>
                Créer un nouveau {selectedSection != null ? SECTION_LABELS[selectedSection].singular.toLowerCase() : ""}
              </h2>
              {!sameSection && (
                <div className="error">
                  Sélection mixte — choisis des fichiers d'une seule section.
                </div>
              )}
              <label>
                Titre
                <input
                  value={titleInput}
                  onChange={(e) => setTitleInput(e.target.value)}
                  placeholder={selectedSection != null ? defaultTitle(selectedSection) : ""}
                  maxLength={256}
                />
              </label>
              <p style={{ color: "var(--muted)", fontSize: "0.85rem", margin: 0 }}>
                Ordre des pages = ordre d'arrivée (date du scan). Tu pourras réorganiser après
                la création.
              </p>
              <button onClick={() => void onAssemble()} disabled={assembling || !sameSection}>
                {assembling ? "Création…" : `Créer (${selected.size} page${selected.size > 1 ? "s" : ""})`}
              </button>
            </section>
          )}

          {(["book", "comic"] as PendingSection[]).map((sec) => {
            const group = bySection[sec];
            if (group.length === 0) return null;
            return (
              <section className="card" key={sec} style={{ marginBottom: "1rem" }}>
                <h2 style={{ margin: "0 0 0.75rem", fontSize: "1.1rem" }}>
                  {SECTION_LABELS[sec].plural} ({group.length})
                </h2>
                <div className="page-list">
                  {group.map((f) => {
                    const isSel = selected.has(f.id);
                    return (
                      <div
                        key={f.id}
                        className="page-thumb"
                        style={{
                          backgroundImage: `url(${thumbUrl(f.thumbnail_url)})`,
                          outline: isSel ? "3px solid var(--accent)" : undefined,
                        }}
                        onClick={() => toggle(f.id)}
                        role="button"
                        tabIndex={0}
                      >
                        <span className="badge">
                          {new Date(f.scanned_at).toLocaleString("fr-CA", {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                        <div className="actions" onClick={(e) => e.stopPropagation()}>
                          <button title="Supprimer" onClick={() => void onDiscard(f.id)}>
                            ✕
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </>
      )}
    </main>
  );
}
