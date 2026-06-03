import { apiFetch } from "./client";
import type { WorkSection, PageResponse } from "./works";

export interface PublicAuthor {
  username: string;
  display_name: string | null;
  age: number | null;
  color: string | null;
  bio: string | null;
  favo: string | null;
  avatar_path: string | null;
  work_count: number;
}

export interface PublicWorkSummary {
  id: number;
  section: WorkSection;
  slug: string;
  title: string;
  blurb: string | null;
  year: number | null;
  is_new: boolean;
  shape: string | null;
  color: string | null;
  cover_path: string | null;
  first_page_path: string | null;
  updated_at: string;

  author_username: string;
  author_display_name: string | null;
  author_color: string | null;
}

export interface PublicWorkDetail extends PublicWorkSummary {
  author_age: number | null;
  pages: PageResponse[];
}

export function listAuthors(): Promise<PublicAuthor[]> {
  return apiFetch<PublicAuthor[]>("/api/public/authors");
}

export function listWorks(filters: {
  section?: WorkSection;
  author?: string;
} = {}): Promise<PublicWorkSummary[]> {
  const params = new URLSearchParams();
  if (filters.section) params.set("section", filters.section);
  if (filters.author) params.set("author", filters.author);
  const qs = params.toString();
  return apiFetch<PublicWorkSummary[]>(`/api/public/works${qs ? `?${qs}` : ""}`);
}

export function getWork(authorUsername: string, slug: string): Promise<PublicWorkDetail> {
  return apiFetch<PublicWorkDetail>(
    `/api/public/works/${encodeURIComponent(authorUsername)}/${encodeURIComponent(slug)}`,
  );
}
