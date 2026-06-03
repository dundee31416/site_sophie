import { apiFetch } from "./client";
import type { UserResponse } from "./auth";

export interface CreateAuthorRequest {
  username: string;
  password: string;
  display_name?: string;
}

export function listAuthors(): Promise<UserResponse[]> {
  return apiFetch<UserResponse[]>("/api/admin/authors");
}

export function createAuthor(payload: CreateAuthorRequest): Promise<UserResponse> {
  return apiFetch<UserResponse>("/api/admin/authors", { method: "POST", body: payload });
}

export function deleteAuthor(id: number): Promise<void> {
  return apiFetch<void>(`/api/admin/authors/${id}`, { method: "DELETE" });
}

export function resetAuthorPassword(id: number, newPassword: string): Promise<void> {
  return apiFetch<void>(`/api/admin/authors/${id}/password`, {
    method: "PATCH",
    body: { new_password: newPassword },
  });
}
