"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Crown,
  Eye,
  Sparkles,
  Target,
  Zap,
  Heart,
  CheckSquare,
  Calendar,
  Sun,
  ChevronRight,
  Settings,
  HelpCircle,
} from "lucide-react";

const NAV = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/legacy", icon: Crown, label: "My Legacy" },
  { href: "/vision", icon: Eye, label: "Vision Canvas" },
  { href: "/values", icon: Sparkles, label: "Values" },
  { href: "/goals", icon: Target, label: "Goals" },
  { href: "/habits", icon: Zap, label: "Habits" },
  { href: "/bucket-list", icon: Heart, label: "Bucket List" },
  { href: "/tasks", icon: CheckSquare, label: "Tasks" },
  { href: "/weekly", icon: Calendar, label: "Weekly Plan" },
  { href: "/daily", icon: Sun, label: "Daily" },
];

const BOTTOM_NAV = [
  { href: "/settings", icon: Settings, label: "Settings" },
];

export default function Sidebar() {
  const pathname = usePathname();

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  return (
    <aside
      className="w-56 flex-shrink-0 flex flex-col h-full"
      style={{
        backgroundColor: "#FFFFFF",
        borderRight: "1px solid #E8DDD0",
      }}
    >
      {/* Logo */}
      <div
        className="h-14 flex items-center px-5 flex-shrink-0"
        style={{ borderBottom: "1px solid #E8DDD0" }}
      >
        <div className="flex items-center gap-2.5">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{
              background: "linear-gradient(135deg, #F97316 0%, #EA580C 100%)",
            }}
          >
            <Crown size={13} className="text-white" />
          </div>
          <div>
            <p
              className="text-xs font-semibold leading-tight"
              style={{ color: "#1C1917" }}
            >
              Life By Design
            </p>
            <p className="text-[10px] leading-tight" style={{ color: "#A8A29E" }}>
              Legacy Platform
            </p>
          </div>
        </div>
      </div>

      {/* Main nav */}
      <nav className="flex-1 py-3 px-3 space-y-0.5 overflow-y-auto">
        <p
          className="text-[10px] font-semibold tracking-widest uppercase px-2 pb-2 pt-1"
          style={{ color: "#A8A29E" }}
        >
          Modules
        </p>
        {NAV.map(({ href, icon: Icon, label }) => {
          const active = isActive(href);
          return (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs transition-all duration-150 group"
              style={{
                backgroundColor: active ? "#FFF7ED" : "transparent",
                color: active ? "#EA580C" : "#78716C",
                fontWeight: active ? "500" : "400",
              }}
            >
              <Icon
                size={14}
                strokeWidth={active ? 2.5 : 1.75}
                style={{ flexShrink: 0 }}
              />
              <span className="flex-1">{label}</span>
              {active && (
                <ChevronRight
                  size={11}
                  style={{ color: "#F97316", opacity: 0.7 }}
                />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom nav */}
      <div
        className="px-3 py-3 space-y-0.5"
        style={{ borderTop: "1px solid #E8DDD0" }}
      >
        {BOTTOM_NAV.map(({ href, icon: Icon, label }) => {
          const active = isActive(href);
          return (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs transition-all duration-150"
              style={{
                backgroundColor: active ? "#FFF7ED" : "transparent",
                color: active ? "#EA580C" : "#A8A29E",
              }}
            >
              <Icon size={13} strokeWidth={1.75} />
              {label}
            </Link>
          );
        })}

        {/* User profile */}
        <div
          className="flex items-center gap-2.5 px-2.5 py-2 mt-1 rounded-lg"
          style={{ backgroundColor: "#FAF5EE" }}
        >
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0"
            style={{
              background: "linear-gradient(135deg, #F97316 0%, #EA580C 100%)",
            }}
          >
            A
          </div>
          <div className="min-w-0">
            <p
              className="text-xs font-medium truncate"
              style={{ color: "#1C1917" }}
            >
              Aryan
            </p>
            <p
              className="text-[10px] truncate"
              style={{ color: "#78716C" }}
            >
              Business Owner
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}
