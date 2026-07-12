import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError, apiFetch } from "./client";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

afterEach(() => {
  mockFetch.mockReset();
});

describe("apiFetch", () => {
  it("parses a JSON body on success", async () => {
    mockFetch.mockResolvedValue(jsonResponse(200, { id: 1, title: "Le chat" }));
    const result = await apiFetch<{ id: number; title: string }>("/api/x");
    expect(result).toEqual({ id: 1, title: "Le chat" });
  });

  it("returns undefined on 204", async () => {
    mockFetch.mockResolvedValue(new Response(null, { status: 204 }));
    await expect(apiFetch<undefined>("/api/x", { method: "DELETE" })).resolves.toBeUndefined();
  });

  it("throws ApiError with the detail message on a JSON error body", async () => {
    mockFetch.mockResolvedValue(jsonResponse(404, { detail: "Not found" }));
    const err = await apiFetch("/api/x").catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).status).toBe(404);
    expect((err as ApiError).message).toBe("Not found");
    expect((err as ApiError).body).toEqual({ detail: "Not found" });
  });

  it("falls back to statusText for a non-JSON error body", async () => {
    mockFetch.mockResolvedValue(
      new Response("<html>boom</html>", { status: 502, statusText: "Bad Gateway" }),
    );
    const err = await apiFetch("/api/x").catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).status).toBe(502);
    expect((err as ApiError).message).toBe("Bad Gateway");
  });

  it("always sends credentials and only sets Content-Type with a body", async () => {
    mockFetch.mockImplementation(() => Promise.resolve(jsonResponse(200, {})));
    await apiFetch("/api/x");
    await apiFetch("/api/x", { method: "POST", body: { a: 1 } });

    const [, getInit] = mockFetch.mock.calls[0] as [string, RequestInit];
    const [, postInit] = mockFetch.mock.calls[1] as [string, RequestInit];

    expect(getInit.credentials).toBe("include");
    expect(getInit.headers).toBeUndefined();
    expect(getInit.body).toBeUndefined();

    expect(postInit.credentials).toBe("include");
    expect(postInit.headers).toEqual({ "Content-Type": "application/json" });
    expect(postInit.body).toBe(JSON.stringify({ a: 1 }));
  });
});
