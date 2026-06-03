import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { ApiError } from "../../api/client";
import * as adminApi from "../../api/admin";
import type { UserResponse } from "../../api/auth";

export function AdminAuthors() {
  const [authors, setAuthors] = useState<UserResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await adminApi.listAuthors();
      setAuthors(rows);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await adminApi.createAuthor({
        username,
        password,
        display_name: displayName.trim() || undefined,
      });
      setUsername("");
      setPassword("");
      setDisplayName("");
      await reload();
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setError(`Le nom "${username}" est déjà utilisé.`);
      } else if (err instanceof ApiError && err.status === 422) {
        setError("Données invalides (au moins 2 caractères pour le nom, 4 pour le mot de passe).");
      } else {
        setError("Impossible de créer l'auteur.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function onDelete(author: UserResponse) {
    const confirmed = window.confirm(
      `Supprimer "${author.display_name ?? author.username}" et tous ses livres ?`,
    );
    if (!confirmed) return;
    try {
      await adminApi.deleteAuthor(author.id);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Suppression impossible");
    }
  }

  return (
    <main>
      <h1>Auteurs</h1>

      <section className="card stack" style={{ marginBottom: "1.5rem" }}>
        <h2 style={{ margin: 0, fontSize: "1.1rem" }}>Créer un nouvel auteur</h2>
        <form onSubmit={onCreate} className="stack">
          <div className="row" style={{ flexWrap: "wrap" }}>
            <label style={{ flex: 1, minWidth: 160 }}>
              Nom d'utilisateur
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                minLength={2}
                maxLength={64}
              />
            </label>
            <label style={{ flex: 1, minWidth: 160 }}>
              Nom affiché (optionnel)
              <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                maxLength={128}
              />
            </label>
            <label style={{ flex: 1, minWidth: 160 }}>
              Mot de passe initial
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={4}
                maxLength={128}
              />
            </label>
          </div>
          <button type="submit" disabled={submitting}>
            {submitting ? "Création…" : "Créer"}
          </button>
        </form>
      </section>

      {error != null && <div className="error" style={{ marginBottom: "1rem" }}>{error}</div>}

      <section className="card">
        <h2 style={{ margin: "0 0 0.75rem", fontSize: "1.1rem" }}>Auteurs existants</h2>
        {loading ? (
          <p>Chargement…</p>
        ) : authors.length === 0 ? (
          <p style={{ color: "var(--muted)" }}>Aucun auteur pour le moment.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Nom affiché</th>
                <th>Nom d'utilisateur</th>
                <th>Créé le</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {authors.map((a) => (
                <tr key={a.id}>
                  <td>{a.display_name ?? a.username}</td>
                  <td>{a.username}</td>
                  <td>{new Date(a.created_at).toLocaleDateString("fr-CA")}</td>
                  <td style={{ textAlign: "right" }}>
                    <button className="danger" onClick={() => void onDelete(a)}>
                      Supprimer
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </main>
  );
}
