import { useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import * as worksApi from "../../api/works";
import type { WorkSection } from "../../api/works";

type Step = "section" | "details" | "files";

const SECTION_OPTIONS: { value: WorkSection; label: string; hint: string }[] = [
  { value: "book", label: "📖 Livre", hint: "Plusieurs pages avec des dessins et du texte." },
  { value: "comic", label: "💬 Bande dessinée", hint: "Plusieurs pages avec des cases et des bulles." },
  { value: "drawing", label: "🎨 Dessin", hint: "Une seule image (dessin à la craie, peinture, etc.)." },
  { value: "craft", label: "✂️ Bricolage", hint: "Une seule photo d'un objet bricolé à la main." },
];

// Sections that hold exactly one image (no multi-page upload).
const SINGLE_IMAGE: WorkSection[] = ["drawing", "craft"];

export function UploadWizard() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("section");
  const [section, setSection] = useState<WorkSection>("book");
  const [title, setTitle] = useState("");
  const [blurb, setBlurb] = useState("");
  const [year, setYear] = useState<string>(String(new Date().getFullYear()));
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const multiFile = !SINGLE_IMAGE.includes(section);

  function onFilesChange(e: ChangeEvent<HTMLInputElement>) {
    const list = e.target.files;
    if (list == null) return;
    setFiles(Array.from(list));
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (files.length === 0) {
      setError("Choisis au moins un fichier.");
      return;
    }
    if (SINGLE_IMAGE.includes(section) && files.length !== 1) {
      setError("Ce type de création doit être un seul fichier.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const work = await worksApi.createWork({
        section,
        title: title.trim(),
        blurb: blurb.trim() || null,
        year: year.trim() === "" ? null : Number(year),
      });
      await worksApi.uploadPages(work.id, files);
      navigate(`/me/works/${work.id}`, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
      setSubmitting(false);
    }
  }

  return (
    <main>
      <div className="row" style={{ justifyContent: "space-between", marginBottom: "1rem" }}>
        <h1 style={{ margin: 0 }}>Nouvelle création</h1>
        <Link to="/me/dashboard" className="ghost-link">
          Annuler
        </Link>
      </div>

      <div className="tabs">
        <button
          className={step === "section" ? "active" : ""}
          onClick={() => setStep("section")}
          type="button"
        >
          1. Section
        </button>
        <button
          className={step === "details" ? "active" : ""}
          onClick={() => title.trim() !== "" || step === "details" ? setStep("details") : null}
          type="button"
        >
          2. Détails
        </button>
        <button
          className={step === "files" ? "active" : ""}
          onClick={() => title.trim() !== "" ? setStep("files") : null}
          type="button"
        >
          3. Fichiers
        </button>
      </div>

      {step === "section" && (
        <section className="card stack">
          <h2 style={{ margin: 0, fontSize: "1.1rem" }}>Choisis le type</h2>
          <div className="stack">
            {SECTION_OPTIONS.map((opt) => (
              <label
                key={opt.value}
                className="card"
                style={{
                  cursor: "pointer",
                  borderColor: section === opt.value ? "var(--accent)" : undefined,
                }}
              >
                <div className="row" style={{ alignItems: "flex-start" }}>
                  <input
                    type="radio"
                    name="section"
                    value={opt.value}
                    checked={section === opt.value}
                    onChange={() => setSection(opt.value)}
                    style={{ marginTop: "0.3rem" }}
                  />
                  <div>
                    <div style={{ fontWeight: 700 }}>{opt.label}</div>
                    <div style={{ color: "var(--muted)", fontSize: "0.9rem" }}>{opt.hint}</div>
                  </div>
                </div>
              </label>
            ))}
          </div>
          <button type="button" onClick={() => setStep("details")}>
            Continuer →
          </button>
        </section>
      )}

      {step === "details" && (
        <section className="card stack">
          <h2 style={{ margin: 0, fontSize: "1.1rem" }}>Détails</h2>
          <label>
            Titre
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
              required
              maxLength={256}
            />
          </label>
          <label>
            Résumé (optionnel)
            <textarea
              rows={3}
              value={blurb}
              onChange={(e) => setBlurb(e.target.value)}
              maxLength={2000}
            />
          </label>
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
          <div className="row">
            <button type="button" className="ghost" onClick={() => setStep("section")}>
              ← Retour
            </button>
            <button
              type="button"
              disabled={title.trim() === ""}
              onClick={() => setStep("files")}
            >
              Continuer →
            </button>
          </div>
        </section>
      )}

      {step === "files" && (
        <form className="card stack" onSubmit={onSubmit}>
          <h2 style={{ margin: 0, fontSize: "1.1rem" }}>
            {multiFile ? "Choisis tes pages" : "Choisis ton dessin"}
          </h2>
          <p style={{ margin: 0, color: "var(--muted)" }}>
            {multiFile
              ? "Plusieurs fichiers image (JPG, PNG). L'ordre = ordre alphabétique. Tu pourras réorganiser ensuite."
              : "Un seul fichier image (JPG, PNG)."}
          </p>
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            multiple={multiFile}
            onChange={onFilesChange}
            required
          />
          {files.length > 0 && (
            <div style={{ color: "var(--muted)", fontSize: "0.9rem" }}>
              {files.length} fichier{files.length > 1 ? "s" : ""} choisi
              {files.length > 1 ? "s" : ""}.
            </div>
          )}
          {error != null && <div className="error">{error}</div>}
          <div className="row">
            <button type="button" className="ghost" onClick={() => setStep("details")}>
              ← Retour
            </button>
            <button type="submit" disabled={submitting || files.length === 0}>
              {submitting ? "Envoi…" : "Créer"}
            </button>
          </div>
        </form>
      )}
    </main>
  );
}
