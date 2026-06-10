import { useEffect, useState } from "react";
import type { ChangeEvent } from "react";
import { ApiError } from "../../api/client";
import * as worksApi from "../../api/works";
import type { WorkResponse } from "../../api/works";

interface Props {
  work: WorkResponse;
  onClose: () => void;
  onChange: (updated: WorkResponse) => void;
}

export function CoverEditor({ work, onClose, onChange }: Props) {
  const [busyKind, setBusyKind] = useState<"upload" | "enhance" | "restyle" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [restyleExtra, setRestyleExtra] = useState("");
  const [showRestyleExtra, setShowRestyleExtra] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function handleError(err: unknown): string {
    if (err instanceof ApiError && err.status === 503) {
      return "Le serveur n'a pas de clé Gemini configurée (GEMINI_API_KEY).";
    }
    if (err instanceof ApiError && err.status === 400) {
      return "Téléverse d'abord une couverture originale.";
    }
    return err instanceof Error ? err.message : "Erreur";
  }

  async function onUpload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file == null) return;
    setBusyKind("upload");
    setError(null);
    setMsg(null);
    try {
      const updated = await worksApi.uploadCover(work.id, file);
      onChange(updated);
      setMsg("Couverture téléversée.");
    } catch (err) {
      setError(handleError(err));
    } finally {
      setBusyKind(null);
    }
  }

  async function onEnhance() {
    if (!window.confirm("Générer une couverture améliorée via Gemini ? (~$0.04)")) return;
    setBusyKind("enhance");
    setError(null);
    setMsg(null);
    try {
      const updated = await worksApi.enhanceCover(work.id);
      onChange(updated);
      setMsg("Version améliorée générée.");
    } catch (err) {
      setError(handleError(err));
    } finally {
      setBusyKind(null);
    }
  }

  async function onRestyle() {
    if (
      !window.confirm(
        "Redessiner la couverture en style album via Gemini ? Le résultat peut différer de l'original. (~$0.04)",
      )
    ) return;
    setBusyKind("restyle");
    setError(null);
    setMsg(null);
    try {
      const updated = await worksApi.restyleCover(work.id, restyleExtra);
      onChange(updated);
      setMsg("Version redessinée générée.");
    } catch (err) {
      setError(handleError(err));
    } finally {
      setBusyKind(null);
    }
  }

  const variants: { key: string; label: string; src: string | null }[] = [
    { key: "original", label: "Original", src: work.cover_path },
    { key: "enhanced", label: "✨ Améliorée", src: work.enhanced_cover_path },
    { key: "restyled", label: "🎨 Redessinée", src: work.restyled_cover_path },
  ];
  const present = variants.filter((v) => v.src != null);
  const busy = busyKind != null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal modal-wide" onClick={(e) => e.stopPropagation()}>
        <div className="row" style={{ justifyContent: "space-between", marginBottom: "1rem" }}>
          <h2 style={{ margin: 0 }}>Couverture — {work.title}</h2>
          <button className="ghost" onClick={onClose}>
            Fermer
          </button>
        </div>

        {error != null && <div className="error" style={{ marginBottom: "1rem" }}>{error}</div>}
        {msg != null && <div style={{ color: "var(--muted)", marginBottom: "1rem" }}>{msg}</div>}

        {present.length === 0 ? (
          <p style={{ color: "var(--muted)" }}>
            Aucune couverture pour le moment. Téléverse une image originale pour commencer.
          </p>
        ) : (
          <div
            className="cover-compare"
            style={{
              gridTemplateColumns: `repeat(${present.length}, minmax(0, 1fr))`,
            }}
          >
            {present.map((v) => (
              <div key={v.key} className="cover-compare-col">
                <div className="modal-image-label">{v.label}</div>
                <img src={v.src!} alt={v.label} />
              </div>
            ))}
          </div>
        )}

        <div className="row" style={{ gap: "0.5rem", marginTop: "1rem", flexWrap: "wrap" }}>
          <label
            className="ghost-link"
            style={{ cursor: busy ? "not-allowed" : "pointer", border: "1px solid var(--border)" }}
          >
            {busyKind === "upload" ? "Envoi…" : "Changer l'original"}
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              onChange={(e) => void onUpload(e)}
              disabled={busy}
              style={{ display: "none" }}
            />
          </label>
          <button onClick={() => void onEnhance()} disabled={busy || work.cover_path == null}>
            {busyKind === "enhance"
              ? "Amélioration…"
              : work.enhanced_cover_path
                ? "↻ Re-générer l'améliorée"
                : "✨ Améliorer"}
          </button>
          <button onClick={() => void onRestyle()} disabled={busy || work.cover_path == null}>
            {busyKind === "restyle"
              ? "Redessin…"
              : work.restyled_cover_path
                ? "↻ Re-générer la redessinée"
                : "🎨 Redessiner"}
          </button>
          <button
            type="button"
            className="ghost"
            onClick={() => setShowRestyleExtra((v) => !v)}
            style={{ fontSize: "0.85rem" }}
          >
            {showRestyleExtra
              ? "Masquer les instructions"
              : "+ Instructions de redessin (optionnel)"}
          </button>
        </div>

        {showRestyleExtra && (
          <div className="stack" style={{ marginTop: "0.75rem" }}>
            <textarea
              rows={4}
              value={restyleExtra}
              onChange={(e) => setRestyleExtra(e.target.value)}
              placeholder="Ex. : « garder le bonnet rouge, fond ciel étoilé, ne pas changer la couleur des yeux ». Sera ajouté au prompt de Gemini avant Redessiner."
              maxLength={4000}
            />
          </div>
        )}
      </div>
    </div>
  );
}
