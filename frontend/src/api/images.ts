/** Rewrite an /uploads image URL to the backend thumbnail endpoint.
 *
 * `/uploads/<path>?v=123` → `/api/thumb/<path>?w=400&v=123`
 *
 * The ?v= cache-buster is preserved so thumbnails roll over with their
 * source image. Non-/uploads URLs (or null) pass through untouched —
 * full-size viewing (reader, editors' comparison views) should keep
 * using the original URL.
 */
export type ThumbWidth = 200 | 400 | 800;

export function thumbUrl(url: string | null, w: ThumbWidth = 400): string | null {
  if (url == null || !url.startsWith("/uploads/")) return url;
  const rest = url.slice("/uploads/".length);
  const qIdx = rest.indexOf("?");
  const path = qIdx === -1 ? rest : rest.slice(0, qIdx);
  const query = qIdx === -1 ? "" : `&${rest.slice(qIdx + 1)}`;
  return `/api/thumb/${path}?w=${w}${query}`;
}
