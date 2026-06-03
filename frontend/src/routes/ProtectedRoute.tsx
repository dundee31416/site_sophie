import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import type { UserRole } from "../api/auth";

interface Props {
  role?: UserRole;
  children: ReactNode;
}

export function ProtectedRoute({ role, children }: Props) {
  const { user, loading } = useAuth();

  if (loading) {
    return <main>Chargement…</main>;
  }

  if (user == null) {
    return <Navigate to="/login" replace />;
  }

  if (role != null && user.role !== role) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
