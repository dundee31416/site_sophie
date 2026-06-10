import { apiFetch, ApiError } from "./client";

export type WorkSection = "book" | "comic" | "drawing";

export type DigitalVariant = "enhanced" | "restyled";

export interface PageResponse {
  id: number;
  idx: number;
  scan_path: string | null;
  html_path: string | null;
  illo_label: string | null;
  enhanced_path: string | null;
  restyled_path: string | null;
  text: string | null;
  enhance_pending: boolean;
  transcribe_pending: boolean;
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
  enhanced_cover_path: string | null;
  restyled_cover_path: string | null;
  digital_variant: DigitalVariant | null;
  cover_variant: DigitalVariant | null;
  cover_enhance_pending: boolean;
  cover_restyle_pending: boolean;
  created_at: string;
  updated_at: string;
}

export function effectiveCoverPath(work: {
  cover_path: string | null;
  enhanced_cover_path: string | null;
  restyled_cover_path: string | null;
  cover_variant: DigitalVariant | null;
}): string | null {
  if (work.cover_variant === "enhanced" && work.enhanced_cover_path != null) {
    return work.enhanced_cover_path;
  }
  if (work.cover_variant === "restyled" && work.restyled_cover_path != null) {
    return work.restyled_cover_path;
  }
  return work.cover_path;
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
  digital_variant?: DigitalVariant | null;
  cover_variant?: DigitalVariant | null;
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

export function enhanceCover(workId: number): Promise<WorkResponse> {
  return apiFetch<WorkResponse>(`/api/me/works/${workId}/cover/enhance`, { method: "POST" });
}

export function restyleCover(
  workId: number,
  extraInstructions?: string,
): Promise<WorkResponse> {
  return apiFetch<WorkResponse>(`/api/me/works/${workId}/cover/restyle`, {
    method: "POST",
    body: { extra_instructions: extraInstructions?.trim() || null },
  });
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

export function updatePageText(
  workId: number,
  pageId: number,
  text: string | null,
): Promise<PageResponse> {
  return apiFetch<PageResponse>(`/api/me/works/${workId}/pages/${pageId}`, {
    method: "PATCH",
    body: { text },
  });
}

export function transcribePage(workId: number, pageId: number): Promise<PageResponse> {
  return apiFetch<PageResponse>(`/api/me/works/${workId}/pages/${pageId}/transcribe`, {
    method: "POST",
  });
}

export function enhancePage(workId: number, pageId: number): Promise<PageResponse> {
  return apiFetch<PageResponse>(`/api/me/works/${workId}/pages/${pageId}/enhance`, {
    method: "POST",
  });
}

export function restylePage(
  workId: number,
  pageId: number,
  extraInstructions?: string,
): Promise<PageResponse> {
  return apiFetch<PageResponse>(`/api/me/works/${workId}/pages/${pageId}/restyle`, {
    method: "POST",
    body: { extra_instructions: extraInstructions?.trim() || null },
  });
}

export function movePage(
  srcWorkId: number,
  pageId: number,
  dstWorkId: number,
): Promise<PageResponse> {
  return apiFetch<PageResponse>(
    `/api/me/works/${srcWorkId}/pages/${pageId}/move-to/${dstWorkId}`,
    { method: "POST" },
  );
}

export function splitWorkAtPage(
  workId: number,
  pageId: number,
  title?: string,
): Promise<WorkResponse> {
  return apiFetch<WorkResponse>(`/api/me/works/${workId}/pages/${pageId}/split`, {
    method: "POST",
    body: { title: title?.trim() || null },
  });
}

export const SECTION_LABELS: Record<WorkSection, string> = {
  book: "Livre",
  comic: "Bande dessinée",
  drawing: "Dessin",
};

export const VARIANT_LABELS: Record<DigitalVariant, string> = {
  enhanced: "Améliorée",
  restyled: "Redessinée",
};
