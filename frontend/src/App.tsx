import { Route, Routes } from "react-router-dom";
import { TopNav } from "./components/TopNav";
import { HomePage } from "./pages/public/HomePage";
import { WorkReader } from "./pages/public/WorkReader";
import { LoginPage } from "./pages/auth/LoginPage";
import { AdminAuthors } from "./pages/admin/AdminAuthors";
import { Dashboard } from "./pages/author/Dashboard";
import { PendingTray } from "./pages/author/PendingTray";
import { ProfileEdit } from "./pages/author/ProfileEdit";
import { UploadWizard } from "./pages/author/UploadWizard";
import { WorkEdit } from "./pages/author/WorkEdit";
import { ProtectedRoute } from "./routes/ProtectedRoute";

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
          path="/me/pending"
          element={
            <ProtectedRoute role="author">
              <PendingTray />
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
