const BASE = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000") + "/api";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("lbd_token");
}

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
    const text = await res.text();
    let message = `HTTP ${res.status}`;
    try { message = (JSON.parse(text) as { message?: string }).message ?? message; } catch {}
    throw new Error(message);
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
