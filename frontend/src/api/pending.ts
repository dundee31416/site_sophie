import { apiFetch } from "./client";
import type { WorkResponse } from "./works";

export type PendingSection = "book" | "comic";

export interface PendingFileResponse {
  id: number;
  section: PendingSection;
  original_filename: string;
  thumbnail_url: string;
  scanned_at: string;
}

export interface AssemblePendingRequest {
  section: PendingSection;
  title?: string | null;
  file_ids: number[];
}

export function listPending(): Promise<PendingFileResponse[]> {
  return apiFetch<PendingFileResponse[]>("/api/me/pending");
}

export function discardPending(id: number): Promise<void> {
  return apiFetch<void>(`/api/me/pending/${id}`, { method: "DELETE" });
}

export function assemblePending(payload: AssemblePendingRequest): Promise<WorkResponse> {
  return apiFetch<WorkResponse>("/api/me/pending/assemble", { method: "POST", body: payload });
}
