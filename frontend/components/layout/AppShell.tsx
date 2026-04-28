"use client";

import { usePathname } from "next/navigation";
import TopNav from "./TopNav";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  if (pathname.startsWith("/admin")) {
    return <div style={{ height: "100vh", overflow: "hidden" }}>{children}</div>;
  }

  return (
    <div className="flex flex-col h-full" style={{ backgroundColor: "#FAF5EE" }}>
      <TopNav />
      <main className="flex-1 overflow-y-auto min-w-0">{children}</main>
    </div>
  );
}
