import { apiFetch, ApiError } from "./client";

export type WorkSection = "book" | "comic" | "drawing";

export interface PageResponse {
  id: number;
  idx: number;
  scan_path: string | null;
  html_path: string | null;
  illo_label: string | null;
}

export interface WorkResponse {
  id: number;
  author_id: number;
  section: WorkSection;
  slug: string;
  title: string;
  blurb: string | null;
  year: number | null;
  is_new: boolean;
  shape: string | null;
  color: string | null;
  cover_path: string | null;
  created_at: string;
  updated_at: string;
}

export interface WorkDetailResponse extends WorkResponse {
  pages: PageResponse[];
}

export interface CreateWorkRequest {
  section: WorkSection;
  title: string;
  blurb?: string | null;
  year?: number | null;
  shape?: string | null;
  color?: string | null;
}

export interface UpdateWorkRequest {
  title?: string;
  blurb?: string | null;
  year?: number | null;
  is_new?: boolean;
  shape?: string | null;
  color?: string | null;
}

export function listMyWorks(): Promise<WorkResponse[]> {
  return apiFetch<WorkResponse[]>("/api/me/works");
}

export function createWork(payload: CreateWorkRequest): Promise<WorkResponse> {
  return apiFetch<WorkResponse>("/api/me/works", { method: "POST", body: payload });
}

export function getWork(id: number): Promise<WorkDetailResponse> {
  return apiFetch<WorkDetailResponse>(`/api/me/works/${id}`);
}

export function updateWork(id: number, payload: UpdateWorkRequest): Promise<WorkResponse> {
  return apiFetch<WorkResponse>(`/api/me/works/${id}`, { method: "PATCH", body: payload });
}

export function deleteWork(id: number): Promise<void> {
  return apiFetch<void>(`/api/me/works/${id}`, { method: "DELETE" });
}

async function uploadMultipart<T>(url: string, form: FormData): Promise<T> {
  const res = await fetch(url, { method: "POST", credentials: "include", body: form });
  const text = await res.text();
  const parsed = text.length > 0 ? safeJson(text) : undefined;
  if (!res.ok) {
    const detail =
      parsed != null && typeof parsed === "object" && parsed != null && "detail" in parsed
        ? String((parsed as { detail: unknown }).detail)
        : res.statusText;
    throw new ApiError(res.status, detail, parsed);
  }
  return parsed as T;
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export function uploadCover(workId: number, file: File): Promise<WorkResponse> {
  const form = new FormData();
  form.append("file", file);
  return uploadMultipart<WorkResponse>(`/api/me/works/${workId}/cover`, form);
}

export function uploadPages(workId: number, files: File[]): Promise<PageResponse[]> {
  const form = new FormData();
  for (const f of files) form.append("files", f);
  return uploadMultipart<PageResponse[]>(`/api/me/works/${workId}/pages`, form);
}

export function reorderPages(workId: number, pageIds: number[]): Promise<PageResponse[]> {
  return apiFetch<PageResponse[]>(`/api/me/works/${workId}/pages/order`, {
    method: "PATCH",
    body: { page_ids: pageIds },
  });
}

export function deletePage(workId: number, pageId: number): Promise<void> {
  return apiFetch<void>(`/api/me/works/${workId}/pages/${pageId}`, { method: "DELETE" });
}

export const SECTION_LABELS: Record<WorkSection, string> = {
  book: "Livre",
  comic: "Bande dessinée",
  drawing: "Dessin",
};
