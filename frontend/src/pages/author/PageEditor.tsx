import { useEffect, useState } from "react";
import { ApiError } from "../../api/client";
import * as worksApi from "../../api/works";
import type { PageResponse } from "../../api/works";

interface Props {
  workId: number;
  page: PageResponse;
  onClose: () => void;
  onChange: (updated: PageResponse) => void;
}

export function PageEditor({ workId, page, onClose, onChange }: Props) {
  const [text, setText] = useState(page.text ?? "");
  const [savingText, setSavingText] = useState(false);
  const [textMsg, setTextMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [transcribing, setTranscribing] = useState(false);
  const [enhancing, setEnhancing] = useState(false);
  const [restyling, setRestyling] = useState(false);
  const [restyleExtra, setRestyleExtra] = useState("");
  const [showRestyleExtra, setShowRestyleExtra] = useState(false);

  useEffect(() => {
    setText(page.text ?? "");
    setError(null);
    setTextMsg(null);
  }, [page.id, page.text]);

  // Close on Escape.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function handleError(err: unknown): string {
    if (err instanceof ApiError) {
      if (err.status === 503) {
        return "Le serveur n'a pas de clé Gemini configurée (GEMINI_API_KEY).";
      }
      return err.message;
    }
    return err instanceof Error ? err.message : "Erreur";
  }

  async function onSaveText() {
    setSavingText(true);
    setError(null);
    setTextMsg(null);
    try {
      const updated = await worksApi.updatePageText(workId, page.id, text.trim() || null);
      onChange(updated);
      setTextMsg("Texte enregistré.");
    } catch (err) {
      setError(handleError(err));
    } finally {
      setSavingText(false);
    }
  }

  async function onTranscribe() {
    if (
      !window.confirm(
        "Transcrire le texte manuscrit via Gemini ? Le résultat remplacera le texte actuel. (~quelques cents)",
      )
    ) {
      return;
    }
    setTranscribing(true);
    setError(null);
    try {
      const updated = await worksApi.transcribePage(workId, page.id);
      setText(updated.text ?? "");
      onChange(updated);
      setTextMsg("Texte transcrit. Tu peux le corriger puis l'enregistrer.");
    } catch (err) {
      setError(handleError(err));
    } finally {
      setTranscribing(false);
    }
  }

  async function onEnhance() {
    if (
      !window.confirm(
        "Générer une version améliorée (papier blanchi, couleurs vives) via Gemini ? (~$0.04 par page)",
      )
    ) {
      return;
    }
    setEnhancing(true);
    setError(null);
    try {
      const updated = await worksApi.enhancePage(workId, page.id);
      onChange(updated);
      setTextMsg("Version améliorée générée.");
    } catch (err) {
      setError(handleError(err));
    } finally {
      setEnhancing(false);
    }
  }

  async function onRestyle() {
    if (
      !window.confirm(
        "Redessiner cette page en style album illustré via Gemini ? Le résultat peut différer du dessin original. (~$0.04 par page)",
      )
    ) {
      return;
    }
    setRestyling(true);
    setError(null);
    try {
      const updated = await worksApi.restylePage(workId, page.id, restyleExtra);
      onChange(updated);
      setTextMsg("Version redessinée générée.");
    } catch (err) {
      setError(handleError(err));
    } finally {
      setRestyling(false);
    }
  }

  const busy = transcribing || enhancing || restyling || savingText;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="row" style={{ justifyContent: "space-between", marginBottom: "1rem" }}>
          <h2 style={{ margin: 0 }}>Page {page.idx}</h2>
          <button className="ghost" onClick={onClose}>
            Fermer
          </button>
        </div>

        {error != null && <div className="error" style={{ marginBottom: "1rem" }}>{error}</div>}
        {textMsg != null && (
          <div style={{ color: "var(--muted)", marginBottom: "1rem" }}>{textMsg}</div>
        )}

        <div className="modal-body">
          <div className="modal-image-col">
            <div className="modal-image-label">Original</div>
            {page.scan_path ? (
              <img src={page.scan_path} alt={`Page ${page.idx} originale`} />
            ) : (
              <div className="modal-image-placeholder">Aucune image</div>
            )}

            {page.enhanced_path != null && (
              <>
                <div className="modal-image-label">Améliorée</div>
                <img src={page.enhanced_path} alt={`Page ${page.idx} améliorée`} />
              </>
            )}
            {page.restyled_path != null && (
              <>
                <div className="modal-image-label">Redessinée</div>
                <img src={page.restyled_path} alt={`Page ${page.idx} redessinée`} />
              </>
            )}

            <div className="stack" style={{ marginTop: "0.5rem" }}>
              <button onClick={() => void onTranscribe()} disabled={busy}>
                {transcribing ? "Transcription…" : "✎ Transcrire le texte"}
              </button>
              <button onClick={() => void onEnhance()} disabled={busy}>
                {enhancing
                  ? "Amélioration…"
                  : page.enhanced_path
                    ? "↻ Re-générer l'améliorée"
                    : "✨ Améliorer l'image"}
              </button>
              <button onClick={() => void onRestyle()} disabled={busy}>
                {restyling
                  ? "Redessin…"
                  : page.restyled_path
                    ? "↻ Re-générer la redessinée"
                    : "🎨 Redessiner en style album"}
              </button>
              <button
                type="button"
                className="ghost"
                onClick={() => setShowRestyleExtra((v) => !v)}
                style={{ fontSize: "0.85rem" }}
              >
                {showRestyleExtra
                  ? "Masquer les instructions de redessin"
                  : "+ Instructions de redessin (optionnel)"}
              </button>
              {showRestyleExtra && (
                <textarea
                  rows={4}
                  value={restyleExtra}
                  onChange={(e) => setRestyleExtra(e.target.value)}
                  placeholder="Ex. : « garder les cheveux blonds et bouclés, mettre un fond de prairie verte, garder la robe à pois rouges ». Sera ajouté au prompt de Gemini."
                  maxLength={4000}
                />
              )}
            </div>
          </div>

          <div className="modal-text-col">
            <label style={{ flex: 1 }}>
              Texte de la page
              <textarea
                rows={16}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Ce que dit la page, mot pour mot. Tu peux corriger les fautes après transcription automatique."
              />
            </label>
            <button onClick={() => void onSaveText()} disabled={busy} style={{ marginTop: "0.5rem" }}>
              {savingText ? "Enregistrement…" : "Enregistrer le texte"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
