import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import * as pendingApi from "../api/pending";
import { useAuth } from "../auth/AuthContext";

/** Global top nav. On the homepage it is rendered inside HomePage's own fixed
 *  header stack (pass `home`); elsewhere it renders itself and suppresses on the
 *  reader/home routes to avoid double bars. */
export function TopNav({ home = false }: { home?: boolean }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [pendingCount, setPendingCount] = useState(0);

  // Poll the pending tray count for authors so the nav badge stays current.
  useEffect(() => {
    if (user?.role !== "author") {
      setPendingCount(0);
      return;
    }
    let cancelled = false;
    async function refresh() {
      try {
        const list = await pendingApi.listPending();
        if (!cancelled) setPendingCount(list.length);
      } catch {
        // ignore — keeps the previous count
      }
    }
    void refresh();
    const t = setInterval(() => void refresh(), 60_000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [user?.role, user?.id]);

  // The homepage renders its own copy (home=true); the reader has its own header.
  // Suppress the global instance on those routes to avoid double bars.
  if (!home && (pathname === "/" || pathname.startsWith("/lecture/"))) return null;

  async function onLogout() {
    await logout();
    navigate("/login", { replace: true });
  }

  return (
    <nav className="top">
      <Link to="/" style={{ textDecoration: "none", fontWeight: 700 }}>
        Lisons!
      </Link>
      {user?.role === "admin" && <Link to="/admin/authors">Auteurs</Link>}
      {user?.role === "author" && <Link to="/me/dashboard">Mon espace</Link>}
      {user?.role === "author" && pendingCount > 0 && (
        <Link to="/me/pending">À organiser ({pendingCount})</Link>
      )}
      <div className="spacer" />
      {user == null ? (
        <Link to="/login">Se connecter</Link>
      ) : (
        <>
          <span className="who">
            {user.display_name ?? user.username} ({user.role})
          </span>
          <button className="ghost" onClick={() => void onLogout()}>
            Déconnexion
          </button>
        </>
      )}
    </nav>
  );
}
