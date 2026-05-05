"use client";

import { useEffect, useState } from "react";
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
      <main className="flex-1 overflow-y-auto overflow-x-hidden min-w-0">{children}</main>
    </div>
  );
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { token } = useAuth();
  const pathname  = usePathname();
  const router    = useRouter();
  const [mounted, setMounted] = useState(false);

  const isLogin  = pathname === "/login";
  const isPublic = pathname === "/" || pathname === "/privacy" || pathname === "/terms";

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    if (!token && !isLogin && !isPublic) router.replace("/login");
    if (token  &&  isLogin) router.replace("/dashboard");
  }, [mounted, token, isLogin, isPublic, router]);

  if (isLogin || isPublic) return <>{children}</>;

  // Render spinner on server and initial client render to avoid hydration mismatch
  if (!mounted || !token) return <Spinner />;

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
