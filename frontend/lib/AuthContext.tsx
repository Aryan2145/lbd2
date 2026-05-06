"use client";

import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { api } from "./api";
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

  async function login(email: string, password: string) {
    const res = await api.post<{ accessToken: string; user: AuthUser }>("/auth/login", { email, password });
    localStorage.setItem("lbd_token",     res.accessToken);
    localStorage.setItem("lbd_auth_user", JSON.stringify(res.user));
    writeCookie(res.accessToken);
    setToken(res.accessToken);
    setUser(res.user);
  }

  function logout() {
    localStorage.removeItem("lbd_token");
    localStorage.removeItem("lbd_auth_user");
    clearCookie();
    clearAppCache();
    setToken(null);
    setUser(null);
  }

  return <Ctx.Provider value={{ token, user, login, logout }}>{children}</Ctx.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
}
