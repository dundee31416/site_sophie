import { apiFetch } from "./client";

export type UserRole = "admin" | "author";

export interface UserResponse {
  id: number;
  username: string;
  role: UserRole;
  display_name: string | null;
  age: number | null;
  color: string | null;
  bio: string | null;
  favo: string | null;
  avatar_path: string | null;
  created_at: string;
}

export function login(username: string, password: string): Promise<UserResponse> {
  return apiFetch<UserResponse>("/api/auth/login", {
    method: "POST",
    body: { username, password },
  });
}

export function logout(): Promise<void> {
  return apiFetch<void>("/api/auth/logout", { method: "POST" });
}

export function me(): Promise<UserResponse> {
  return apiFetch<UserResponse>("/api/auth/me");
}
