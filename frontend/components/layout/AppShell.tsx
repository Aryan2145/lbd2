"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import { AppProvider } from "@/lib/AppStore";
import TopNav from "./TopNav";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { token } = useAuth();
  const pathname  = usePathname();
  const router    = useRouter();

  const isLogin = pathname === "/login";

  useEffect(() => {
    if (!token && !isLogin) router.replace("/login");
    if (token  &&  isLogin) router.replace("/legacy");
  }, [token, isLogin, router]);

  // Login page: no shell, no AppProvider
  if (isLogin) return <>{children}</>;

  // Not authenticated yet — blank while redirect fires
  if (!token) return null;

  if (pathname.startsWith("/admin")) {
    return (
      <AppProvider>
        <div style={{ height: "100vh", overflow: "hidden" }}>{children}</div>
      </AppProvider>
    );
  }

  return (
    <AppProvider>
      <div className="flex flex-col h-full" style={{ backgroundColor: "#FAF5EE" }}>
        <TopNav />
        <main className="flex-1 overflow-y-auto min-w-0">{children}</main>
      </div>
    </AppProvider>
  );
}
