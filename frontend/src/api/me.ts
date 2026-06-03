import { apiFetch } from "./client";
import type { UserResponse } from "./auth";

export interface UpdateProfileRequest {
  display_name?: string | null;
  age?: number | null;
  color?: string | null;
  bio?: string | null;
  favo?: string | null;
}

export function updateProfile(payload: UpdateProfileRequest): Promise<UserResponse> {
  return apiFetch<UserResponse>("/api/me", { method: "PATCH", body: payload });
}

export function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  return apiFetch<void>("/api/me/password", {
    method: "POST",
    body: { current_password: currentPassword, new_password: newPassword },
  });
}

export async function uploadAvatar(file: File): Promise<UserResponse> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch("/api/me/avatar", {
    method: "POST",
    credentials: "include",
    body: form,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Upload failed (${res.status})`);
  }
  return (await res.json()) as UserResponse;
}
