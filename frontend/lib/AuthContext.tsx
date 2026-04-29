"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { api } from "./api";

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

  async function login(email: string, password: string) {
    const res = await api.post<{ accessToken: string; user: AuthUser }>("/auth/login", { email, password });
    localStorage.setItem("lbd_token",     res.accessToken);
    localStorage.setItem("lbd_auth_user", JSON.stringify(res.user));
    setToken(res.accessToken);
    setUser(res.user);
  }

  function logout() {
    localStorage.removeItem("lbd_token");
    localStorage.removeItem("lbd_auth_user");
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
