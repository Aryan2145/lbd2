import TopNav from "./TopNav";

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col h-full" style={{ backgroundColor: "#FAF5EE" }}>
      <TopNav />
      <main className="flex-1 overflow-y-auto min-w-0">{children}</main>
    </div>
  );
}
