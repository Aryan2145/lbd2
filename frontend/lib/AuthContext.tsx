"use client";

import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { api, setUnauthorizedHandler, type ApiError } from "./api";
import { clearAppCache } from "./appCache";

export interface AuthUser {
  id:     string;
  name:   string;
  email:  string;
  phone?: string;
  role?:  string;
}

interface AuthState {
  token: string | null;
  user:  AuthUser | null;
  login:  (email: string, password: string) => Promise<void>;
  applySession: (accessToken: string, user: AuthUser) => void;
  logout: () => void;
}

const Ctx = createContext<AuthState | null>(null);

const COOKIE_NAME = "lbd_token";
const COOKIE_MAX_AGE_DAYS = 30;

// Mirror the JWT to a cookie so middleware (server-side) can see it.
// Not HttpOnly because api.ts still reads from localStorage to set the
// Authorization header. The cookie is just an existence-marker for routing.
function writeCookie(token: string) {
  if (typeof document === "undefined") return;
  const secure = location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${COOKIE_NAME}=${token}; path=/; max-age=${COOKIE_MAX_AGE_DAYS * 24 * 60 * 60}; SameSite=Lax${secure}`;
}

function clearCookie() {
  if (typeof document === "undefined") return;
  document.cookie = `${COOKIE_NAME}=; path=/; max-age=0; SameSite=Lax`;
}

function readStored(): { token: string | null; user: AuthUser | null } {
  if (typeof window === "undefined") return { token: null, user: null };
  const token = localStorage.getItem("lbd_token");
  const raw   = localStorage.getItem("lbd_auth_user");
  try { return { token, user: raw ? (JSON.parse(raw) as AuthUser) : null }; }
  catch { return { token, user: null }; }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const init = readStored();
  const [token, setToken] = useState<string | null>(init.token);
  const [user,  setUser]  = useState<AuthUser | null>(init.user);

  // On first mount, mirror the existing localStorage token to a cookie
  // (handles the upgrade case for users who logged in before cookie sync existed).
  useEffect(() => {
    if (init.token) writeCookie(init.token);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function applySession(accessToken: string, u: AuthUser) {
    localStorage.setItem("lbd_token",     accessToken);
    localStorage.setItem("lbd_auth_user", JSON.stringify(u));
    writeCookie(accessToken);
    setToken(accessToken);
    setUser(u);
  }

  function killSession() {
    localStorage.removeItem("lbd_token");
    localStorage.removeItem("lbd_auth_user");
    clearCookie();
    clearAppCache();
    setToken(null);
    setUser(null);
  }

  // Session is gone (expired / invalidated) — clear it and go to login cleanly.
  function forceRelogin() {
    killSession();
    if (typeof window !== "undefined" && window.location.pathname !== "/login") {
      window.location.href = "/login";
    }
  }

  async function login(email: string, password: string) {
    const res = await api.post<{ accessToken: string; user: AuthUser }>("/auth/login", { email, password });
    applySession(res.accessToken, res.user);
  }

  function logout() {
    killSession();
  }

  // Register the global 401 handler once: any logged-in request that gets
  // rejected clears the dead session and returns the user to login.
  useEffect(() => {
    setUnauthorizedHandler(forceRelogin);
    return () => setUnauthorizedHandler(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sliding session — renew the 30-day token whenever the app is opened or
  // refocused, so an actively-used account effectively never logs out. A token
  // that has genuinely lapsed (≈30 days idle) makes /auth/refresh return 401,
  // which forces a clean re-login.
  useEffect(() => {
    if (!init.token) return;
    let lastRefresh = 0;
    const slide = async () => {
      if (Date.now() - lastRefresh < 5 * 60 * 1000) return; // at most once per 5 min
      lastRefresh = Date.now();
      try {
        const res = await api.post<{ accessToken: string; user: AuthUser }>("/auth/refresh", {});
        applySession(res.accessToken, res.user);
      } catch (e) {
        if ((e as ApiError).status === 401) forceRelogin();
        // Network / other errors: keep the session and retry on the next focus.
      }
    };
    slide();
    const onFocus = () => { slide(); };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <Ctx.Provider value={{ token, user, login, applySession, logout }}>{children}</Ctx.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
}
