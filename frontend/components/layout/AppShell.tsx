"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import { AppProvider, useAppStore } from "@/lib/AppStore";
import TopNav from "./TopNav";

function Spinner() {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-3" style={{ backgroundColor: "#FAF5EE" }}>
      <div
        className="animate-spin"
        style={{ width: 36, height: 36, borderRadius: "50%", border: "3px solid #EDE5D8", borderTopColor: "#F97316" }}
      />
      <p style={{ fontSize: 13, color: "#A8A29E" }}>Loading your data…</p>
    </div>
  );
}

function AppContent({ children }: { children: React.ReactNode }) {
  const { loaded } = useAppStore();
  if (!loaded) return <Spinner />;
  return (
    <div className="flex flex-col h-full" style={{ backgroundColor: "#FAF5EE" }}>
      <TopNav />
      <main className="flex-1 overflow-y-auto min-w-0">{children}</main>
    </div>
  );
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { token } = useAuth();
  const pathname  = usePathname();
  const router    = useRouter();

  const isLogin  = pathname === "/login";
  const isPublic = pathname === "/" || pathname === "/privacy" || pathname === "/terms";

  useEffect(() => {
    if (!token && !isLogin && !isPublic) router.replace("/login");
    if (token  &&  isLogin) router.replace("/legacy");
  }, [token, isLogin, isPublic, router]);

  if (isLogin || isPublic) return <>{children}</>;
  if (!token)  return null;

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
