export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public body?: unknown,
  ) {
    super(message);
  }
}

type Method = "GET" | "POST" | "PATCH" | "DELETE" | "PUT";

interface RequestOpts {
  method?: Method;
  body?: unknown;
  signal?: AbortSignal;
}

export async function apiFetch<T>(path: string, opts: RequestOpts = {}): Promise<T> {
  const { method = "GET", body, signal } = opts;
  const res = await fetch(path, {
    method,
    credentials: "include",
    headers: body != null ? { "Content-Type": "application/json" } : undefined,
    body: body != null ? JSON.stringify(body) : undefined,
    signal,
  });

  if (res.status === 204) {
    return undefined as T;
  }

  const text = await res.text();
  const parsed: unknown = text.length > 0 ? safeJsonParse(text) : undefined;

  if (!res.ok) {
    const detail =
      parsed != null && typeof parsed === "object" && "detail" in parsed
        ? String((parsed as { detail: unknown }).detail)
        : res.statusText;
    throw new ApiError(res.status, detail, parsed);
  }

  return parsed as T;
}

function safeJsonParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}
