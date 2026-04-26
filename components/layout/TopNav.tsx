"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, Crown, Search } from "lucide-react";

const NAV = [
  { href: "/dashboard",    label: "Dashboard"     },
  { href: "/legacy",       label: "My Legacy"     },
  { href: "/vision",       label: "Vision Canvas" },
  { href: "/goals",        label: "Goals"         },
  { href: "/habits",       label: "Habits"        },
  { href: "/tasks",        label: "Tasks"         },
  { href: "/weekly",       label: "Weekly Plan"   },
  { href: "/daily",        label: "Daily"         },
];

export default function TopNav() {
  const pathname = usePathname();

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  return (
    <header
      style={{
        height: "56px",
        backgroundColor: "#FFFFFF",
        borderBottom: "1px solid #E8DDD0",
        display: "flex",
        alignItems: "center",
        paddingLeft: "24px",
        paddingRight: "24px",
        gap: "0",
        flexShrink: 0,
        zIndex: 30,
        position: "sticky",
        top: 0,
      }}
    >
      {/* Logo */}
      <Link href="/legacy" style={{ display: "flex", alignItems: "center", gap: "8px", textDecoration: "none", marginRight: "32px", flexShrink: 0 }}>
        <div
          style={{
            width: "28px",
            height: "28px",
            borderRadius: "8px",
            background: "linear-gradient(135deg, #F97316, #EA580C)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <Crown size={13} color="#fff" />
        </div>
        <span style={{ fontSize: "14px", fontWeight: 700, color: "#1C1917", letterSpacing: "-0.01em" }}>
          Life By Design
        </span>
      </Link>

      {/* Nav links — centered */}
      <nav style={{ display: "flex", alignItems: "center", gap: "2px", flex: 1, justifyContent: "center" }}>
        {NAV.map(({ href, label }) => {
          const active = isActive(href);
          return (
            <Link
              key={href}
              href={href}
              style={{
                padding: "5px 13px",
                borderRadius: "20px",
                fontSize: "13px",
                fontWeight: active ? 600 : 400,
                color: active ? "#EA580C" : "#78716C",
                backgroundColor: active ? "#FFF7ED" : "transparent",
                textDecoration: "none",
                transition: "all 0.15s ease",
                whiteSpace: "nowrap",
                border: active ? "1px solid #FED7AA" : "1px solid transparent",
              }}
            >
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Right side */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginLeft: "32px", flexShrink: 0 }}>
        {/* Search */}
        <button
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            padding: "5px 12px",
            borderRadius: "20px",
            border: "1px solid #E8DDD0",
            backgroundColor: "#FAF5EE",
            fontSize: "12px",
            color: "#A8A29E",
            cursor: "pointer",
          }}
        >
          <Search size={12} />
          <span>Search</span>
        </button>

        {/* Bell */}
        <button
          style={{
            width: "34px",
            height: "34px",
            borderRadius: "50%",
            border: "1px solid #E8DDD0",
            backgroundColor: "#FFFFFF",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            position: "relative",
          }}
        >
          <Bell size={14} color="#78716C" />
          <span
            style={{
              position: "absolute",
              top: "5px",
              right: "5px",
              width: "7px",
              height: "7px",
              borderRadius: "50%",
              backgroundColor: "#F97316",
              border: "1.5px solid #FFFFFF",
            }}
          />
        </button>

        {/* Avatar */}
        <div
          style={{
            width: "34px",
            height: "34px",
            borderRadius: "50%",
            background: "linear-gradient(135deg, #F97316, #EA580C)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "13px",
            fontWeight: 700,
            color: "#FFFFFF",
            cursor: "pointer",
            flexShrink: 0,
          }}
        >
          A
        </div>
      </div>
    </header>
  );
}
