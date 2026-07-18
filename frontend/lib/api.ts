const BASE = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000") + "/api";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("lbd_token");
}

export type ApiError = Error & { status?: number };

// Set by AuthProvider. Invoked when a normal (logged-in) request is rejected with
// 401 — i.e. the session died. Lets the app clear it and send the user to login
// instead of every caller silently swallowing the error and showing a dead page.
let onUnauthorized: (() => void) | null = null;
export function setUnauthorizedHandler(fn: (() => void) | null) { onUnauthorized = fn; }

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = {};
  const token = getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;
  if (body !== undefined) headers["Content-Type"] = "application/json";

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    // A 401 on anything other than the auth endpoints (login returns 401 for a
    // wrong password; refresh handles its own) means our session is no longer
    // valid — hand off to the app to re-login cleanly.
    if (res.status === 401 && !path.startsWith("/auth/")) onUnauthorized?.();
    const text = await res.text();
    let message = `HTTP ${res.status}`;
    try { message = (JSON.parse(text) as { message?: string }).message ?? message; } catch {}
    const err = new Error(message) as ApiError;
    err.status = res.status;
    throw err;
  }

  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

export const api = {
  get:   <T>(path: string)                => request<T>("GET",    path),
  post:  <T>(path: string, body: unknown) => request<T>("POST",   path, body),
  put:   <T>(path: string, body: unknown) => request<T>("PUT",    path, body),
  patch: <T>(path: string, body: unknown) => request<T>("PATCH",  path, body),
  del:   <T>(path: string)                => request<T>("DELETE", path),
};

/**
 * Encrypted media (images stored in R2). Upload returns an opaque id that is
 * persisted on the entry (e.g. bucket `imageUrl`). The bytes are viewed via the
 * auth-guarded stream endpoint — which `<img src>` can't reach directly (no auth
 * header), so we fetch as a blob and hand back an object URL for the caller to use.
 */
export async function uploadMedia(file: File): Promise<{ id: string }> {
  const token = getToken();
  const form = new FormData();
  form.append("file", file); // field name must match FileInterceptor('file')

  const res = await fetch(`${BASE}/media/upload`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form, // NB: let the browser set the multipart Content-Type + boundary
  });

  if (!res.ok) {
    const text = await res.text();
    let message = `HTTP ${res.status}`;
    try { message = (JSON.parse(text) as { message?: string }).message ?? message; } catch {}
    throw new Error(message);
  }
  return res.json() as Promise<{ id: string }>;
}

/** Fetch an encrypted media variant and return an object URL (caller revokes it). */
export async function fetchMediaObjectUrl(id: string, variant: "full" | "thumb" = "full"): Promise<string> {
  const token = getToken();
  const path  = variant === "thumb" ? `/media/${id}/thumb` : `/media/${id}`;
  const res = await fetch(`${BASE}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return URL.createObjectURL(await res.blob());
}

/** Best-effort delete of an uploaded media object (e.g. rolling back a failed save). */
export function deleteMedia(id: string): void {
  const token = getToken();
  fetch(`${BASE}/media/${id}`, {
    method: "DELETE",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  }).catch(() => {});
}

/**
 * Leaderboard consistency heads. Fire-and-forget — records that the user did
 * something on this head today/this week. Idempotent server-side (once per
 * period), so calling it on every action is fine. Never throws.
 */
export type ActivityHead =
  | "weekly_plan" | "weekly_review" | "daily_review" | "daily_plan" | "tasks" | "habits";

export function trackActivity(head: ActivityHead): void {
  request("POST", "/activity", { head }).catch(() => {});
}
