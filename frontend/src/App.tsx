import { Link, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "./auth/AuthContext";
import { HomePage } from "./pages/public/HomePage";
import { WorkReader } from "./pages/public/WorkReader";
import { LoginPage } from "./pages/auth/LoginPage";
import { AdminAuthors } from "./pages/admin/AdminAuthors";
import { Dashboard } from "./pages/author/Dashboard";
import { ProfileEdit } from "./pages/author/ProfileEdit";
import { UploadWizard } from "./pages/author/UploadWizard";
import { WorkEdit } from "./pages/author/WorkEdit";
import { ProtectedRoute } from "./routes/ProtectedRoute";

function TopNav() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  // The public reader handles its own header; suppress the global top nav
  // while inside one to avoid double-bars.
  if (pathname.startsWith("/lecture/")) return null;

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

export function App() {
  return (
    <>
      <TopNav />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/lecture/:author/:slug" element={<WorkReader />} />
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/admin/authors"
          element={
            <ProtectedRoute role="admin">
              <AdminAuthors />
            </ProtectedRoute>
          }
        />
        <Route
          path="/me/dashboard"
          element={
            <ProtectedRoute role="author">
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/me/profile"
          element={
            <ProtectedRoute role="author">
              <ProfileEdit />
            </ProtectedRoute>
          }
        />
        <Route
          path="/me/upload"
          element={
            <ProtectedRoute role="author">
              <UploadWizard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/me/works/:id"
          element={
            <ProtectedRoute role="author">
              <WorkEdit />
            </ProtectedRoute>
          }
        />
      </Routes>
    </>
  );
}
