"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import { AppProvider, useAppStore } from "@/lib/AppStore";
import TopNav from "./TopNav";

function TopLoadingBar() {
  return (
    <div
      aria-hidden
      style={{
        position: "fixed", top: 0, left: 0, right: 0,
        height: 3, zIndex: 200, overflow: "hidden",
        backgroundColor: "rgba(249,115,22,0.08)",
        pointerEvents: "none",
      }}
    >
      <div style={{
        width: "40%", height: "100%",
        background: "linear-gradient(90deg, transparent, #F97316, #EA580C, transparent)",
        animation: "lbd-progress-slide 1.2s ease-in-out infinite",
      }} />
    </div>
  );
}

function LoadingPill() {
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "center",
      height: "100%", padding: 24,
    }}>
      <div style={{
        display: "inline-flex", alignItems: "center", gap: 10,
        padding: "10px 18px", borderRadius: 999,
        backgroundColor: "#FFFFFF",
        border: "1px solid #EDE5D8",
        boxShadow: "0 4px 14px rgba(28,25,23,0.06)",
      }}>
        <div
          className="animate-spin"
          style={{
            width: 16, height: 16, borderRadius: "50%",
            border: "2px solid #FFE4CC", borderTopColor: "#F97316",
          }}
        />
        <span style={{ fontSize: 13, color: "#57534E", fontWeight: 500 }}>
          Loading your data…
        </span>
      </div>
    </div>
  );
}

function AppContent({ children }: { children: React.ReactNode }) {
  const { loaded } = useAppStore();
  const pathname   = usePathname();
  return (
    <div className="flex flex-col h-full" style={{ backgroundColor: "#FFFFFF", position: "relative" }}>
      {!loaded && <TopLoadingBar />}
      <TopNav />
      <main className="flex-1 overflow-y-auto overflow-x-hidden min-w-0 lbd-hide-scrollbar">
        {loaded ? (
          // `key={pathname}` re-runs the fade-in animation on every internal navigation
          <div key={pathname} className="lbd-page-fade h-full">{children}</div>
        ) : (
          <LoadingPill />
        )}
      </main>
    </div>
  );
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { token } = useAuth();
  const pathname  = usePathname();
  const router    = useRouter();
  const [mounted, setMounted] = useState(false);

  const isLogin    = pathname === "/login";
  const isRegister = pathname === "/register";
  const isAuth     = isLogin || isRegister;
  const isPublic   = pathname === "/privacy" || pathname === "/terms";
  const isAdmin    = pathname.startsWith("/admin");

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    if (!token && !isAuth && !isPublic && !isAdmin) router.replace("/login");
    if (token  &&  isAuth) router.replace("/dashboard");
  }, [mounted, token, isAuth, isPublic, isAdmin, router]);

  if (isAuth || isPublic) return <>{children}</>;

  // Middleware has already gated protected routes to authenticated users,
  // so we render the layout immediately. AppContent shows its own data
  // loading state inside <AppProvider> while the API calls are in flight,
  // which is the only "loading" the user should see on a protected page.

  if (pathname.startsWith("/admin")) {
    return (
      <AppProvider>
        <div style={{ height: "100vh", overflow: "hidden" }}>{children}</div>
      </AppProvider>
    );
  }

  return (
    <AppProvider>
      <AppContent>{children}</AppContent>
    </AppProvider>
  );
}
