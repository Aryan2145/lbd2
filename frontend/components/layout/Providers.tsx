"use client";

import { AppProvider } from "@/lib/AppStore";

export default function Providers({ children }: { children: React.ReactNode }) {
  return <AppProvider>{children}</AppProvider>;
}
