"use client";

import { useSession, signOut } from "next-auth/react";
import { usePathname } from "next/navigation";
import Link from "next/link";

const navItems = [
  { href: "/", label: "Dashboard" },
  { href: "/alert_management", label: "Alert Management" },
  { href: "/case_management", label: "Case Management" },
  { href: "/str", label: "STR Module" },
  { href: "/admin", label: "Admin" },
  { href: "/regulator", label: "Regulator" },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const pathname = usePathname();

  // Don't render shell on login page
  if (pathname === "/login") {
    return <>{children}</>;
  }

  const user = session?.user as
    | { name?: string; email?: string; role?: string }
    | undefined;

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      {/* Sidebar */}
      <nav
        style={{
          width: 220,
          background: "#0b1220",
          color: "#e5e7eb",
          padding: "20px 12px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          flexShrink: 0,
        }}
      >
        <div>
          <h2 style={{ fontSize: 18, marginBottom: 24, fontWeight: 700 }}>
            AML System
          </h2>
          <ul
            style={{
              listStyle: "none",
              padding: 0,
              margin: 0,
              display: "flex",
              flexDirection: "column",
              gap: 2,
            }}
          >
            {navItems.map((item) => {
              const active = pathname === item.href;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    style={{
                      display: "block",
                      padding: "8px 12px",
                      borderRadius: 6,
                      color: active ? "#fff" : "#94a3b8",
                      background: active ? "#1e3a5f" : "transparent",
                      textDecoration: "none",
                      fontSize: 14,
                      fontWeight: active ? 600 : 400,
                    }}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>

        {/* User info & logout */}
        {user && (
          <div
            style={{
              borderTop: "1px solid #1e293b",
              paddingTop: 16,
              fontSize: 13,
            }}
          >
            <div style={{ color: "#e5e7eb", marginBottom: 2 }}>
              {user.name}
            </div>
            <div style={{ color: "#64748b", marginBottom: 8 }}>
              {user.role}
            </div>
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              style={{
                width: "100%",
                padding: "6px 0",
                borderRadius: 4,
                border: "1px solid #334155",
                background: "transparent",
                color: "#f87171",
                cursor: "pointer",
                fontSize: 13,
              }}
            >
              Sign Out
            </button>
          </div>
        )}
      </nav>

      {/* Main content */}
      <main style={{ flex: 1, overflow: "auto" }}>{children}</main>
    </div>
  );
}
