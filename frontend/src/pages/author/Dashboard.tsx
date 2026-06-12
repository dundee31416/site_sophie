import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { thumbUrl } from "../../api/images";
import * as worksApi from "../../api/works";
import type { WorkResponse } from "../../api/works";
import { SECTION_LABELS } from "../../api/works";
import { useAuth } from "../../auth/AuthContext";

export function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [works, setWorks] = useState<WorkResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    worksApi
      .listMyWorks()
      .then((rows) => {
        setWorks(rows);
        setError(null);
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Erreur"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <main>
      <div className="row" style={{ justifyContent: "space-between", marginBottom: "1rem" }}>
        <h1 style={{ margin: 0 }}>Bonjour {user?.display_name ?? user?.username} !</h1>
        <div className="row">
          <Link to="/me/profile" className="ghost-link">
            Mon profil
          </Link>
          <button onClick={() => navigate("/me/upload")}>+ Nouveau</button>
        </div>
      </div>

      {error != null && <div className="error">{error}</div>}

      {loading ? (
        <p>Chargement…</p>
      ) : works.length === 0 ? (
        <section className="card">
          <p style={{ color: "var(--muted)", margin: 0 }}>
            Aucune création pour le moment. Clique sur <strong>+ Nouveau</strong> pour ajouter
            ton premier livre, ta bande dessinée ou ton dessin.
          </p>
        </section>
      ) : (
        <div className="grid">
          {works.map((w) => (
            <Link
              key={w.id}
              to={`/me/works/${w.id}`}
              className="card work-card"
              style={{ textDecoration: "none", color: "inherit" }}
            >
              <div
                className="cover"
                style={{
                  backgroundImage: w.cover_path ? `url(${thumbUrl(w.cover_path)})` : undefined,
                  backgroundColor: w.cover_path ? undefined : w.color ?? "var(--accent-soft)",
                }}
              >
                {w.cover_path == null && (
                  <span style={{ color: "var(--muted)", fontSize: "0.85rem" }}>
                    {SECTION_LABELS[w.section]}
                  </span>
                )}
              </div>
              <div style={{ padding: "0.5rem 0" }}>
                <div style={{ fontWeight: 700 }}>{w.title}</div>
                <div style={{ color: "var(--muted)", fontSize: "0.85rem" }}>
                  {SECTION_LABELS[w.section]}
                  {w.year != null ? ` · ${w.year}` : ""}
                  {w.is_new ? " · ✨ Nouveau" : ""}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
