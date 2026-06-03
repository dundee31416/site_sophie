import { useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import { ApiError } from "../../api/client";

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const user = await login(username, password);
      navigate(
        user.role === "admin"
          ? "/admin/authors"
          : user.role === "author"
            ? "/me/dashboard"
            : "/",
        { replace: true },
      );
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setError("Nom d'utilisateur ou mot de passe incorrect.");
      } else {
        setError("Connexion impossible.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main>
      <h1>Se connecter</h1>
      <form className="card stack" onSubmit={onSubmit} style={{ maxWidth: 360 }}>
        <label>
          Nom d'utilisateur
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoFocus
            required
          />
        </label>
        <label>
          Mot de passe
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>
        {error != null && <div className="error">{error}</div>}
        <button type="submit" disabled={submitting}>
          {submitting ? "Connexion…" : "Se connecter"}
        </button>
      </form>
    </main>
  );
}
