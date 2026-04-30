"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components";
import { useAuth } from "@/lib/auth-context";

interface NavSection {
  title: string;
  icon: string;
  items: Array<{ href: string; label: string; icon: string }>;
}

const navSections: NavSection[] = [
  {
    title: "📊 Monitoring",
    icon: "📊",
    items: [
      { href: "/", label: "Dashboard", icon: "📈" },
      { href: "/alert_management", label: "Alerts", icon: "🚨" },
      { href: "/transactions", label: "Transactions", icon: "💳" },
    ],
  },
  {
    title: "🔍 Investigation",
    icon: "🔍",
    items: [
      { href: "/case_management", label: "Cases", icon: "📋" },
      { href: "/str", label: "STR Submissions", icon: "📝" },
    ],
  },
  {
    title: "⚙️ Administration",
    icon: "⚙️",
    items: [
      { href: "/admin", label: "Admin Panel", icon: "🔧" },
      { href: "/regulator", label: "Regulatory", icon: "🏛️" },
    ],
  },
];

function getNormalizePath(pathname: string): string {
  return pathname.split("?")[0].split("#")[0];
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { user, isLoading, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const normalizedPath = getNormalizePath(pathname);
  const isPublicRoute = pathname === "/login" || pathname === "/sign-up";
  const isAdmin = user?.role === "admin";

  useEffect(() => {
    if (!isPublicRoute && !isLoading && !user) {
      router.replace("/login");
    }
  }, [isLoading, isPublicRoute, router, user]);

  // Don't render shell on public auth pages
  if (isPublicRoute) {
    return <>{children}</>;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-primary text-text-secondary">
        Loading secure session...
      </div>
    );
  }

  // Get breadcrumbs from current path
  const getBreadcrumbs = (): Array<{ label: string; href: string }> => {
    const pathParts = normalizedPath.split("/").filter(Boolean);
    const breadcrumbs = [{ label: "Home", href: "/" }];

    let currentPath = "";
    for (const part of pathParts) {
      currentPath += "/" + part;
      const label = part
        .split("_")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
      breadcrumbs.push({ label, href: currentPath });
    }

    return breadcrumbs;
  };

  const breadcrumbs = getBreadcrumbs();
  const isActive = (href: string): boolean => {
    return normalizedPath === href || (href === "/" && normalizedPath === "");
  };

  return (
    <div className="flex min-h-screen bg-bg-primary">
      {/* Sidebar */}
      <aside
        className="w-60 bg-bg-sidebar border-r border-border-default flex flex-col justify-between shrink-0"
        style={{ fontFamily: "var(--font-body)" }}
      >
        {/* Logo & Title */}
        <div className="p-6">
          <Link href="/" className="flex items-center gap-3 mb-8 hover:opacity-80 transition-opacity">
            <div className="w-10 h-10 rounded-lg bg-linear-to-br from-primary-600 to-primary-700 flex items-center justify-center text-white font-bold text-lg">
              ⚖️
            </div>
            <div>
              <h1 className="text-lg font-bold text-primary m-0">AML Monitor</h1>
              <p className="text-xs text-text-secondary m-0">Nigeria</p>
            </div>
          </Link>

          {/* Navigation Sections */}
          <nav className="space-y-6">
            {navSections
              .filter((section) => section.title !== "⚙️ Administration" || isAdmin)
              .map((section) => (
              <div key={section.title}>
                <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wide px-2 mb-3">
                  {section.title}
                </h3>
                <ul className="space-y-1">
                  {section.items.map((item) => (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className={`
                          flex items-center gap-3 px-3 py-2 rounded-lg transition-all
                          ${
                            isActive(item.href)
                              ? "bg-primary-600 text-white font-semibold"
                              : "text-text-secondary hover:text-primary hover:bg-bg-secondary"
                          }
                        `}
                      >
                        <span className="text-lg shrink-0">{item.icon}</span>
                        <span className="text-sm">{item.label}</span>
                        {isActive(item.href) && (
                          <span className="ml-auto w-2 h-2 bg-white rounded-full"></span>
                        )}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>

        {/* User Info & Logout */}
        {user && (
          <div className="p-6 border-t border-border-default space-y-4">
            <div className="bg-bg-secondary rounded-lg p-4">
              <p className="text-xs text-text-secondary mb-1">Logged in as</p>
              <p className="font-semibold text-primary text-sm mb-2">{user.name || "Officer"}</p>
              {user.role && (
                <div className="inline-block px-2 py-1 bg-primary-100 rounded text-xs font-medium text-primary-900">
                  {user.role === "admin" ? "Administrator" : "Regulator"}
                </div>
              )}
            </div>
            <Button
              onClick={() => {
                logout();
                router.replace("/login");
              }}
              variant="danger"
              fullWidth
              size="sm"
            >
              Sign Out
            </Button>
          </div>
        )}
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header with Breadcrumbs */}
        <header className="bg-bg-secondary border-b border-border-default px-8 py-4 sticky top-0 z-40">
          <div className="flex items-center justify-between mb-4">
            <nav className="flex items-center gap-2 text-sm">
              {breadcrumbs.map((breadcrumb, idx) => (
                <div key={breadcrumb.href} className="flex items-center gap-2">
                  {idx > 0 && <span className="text-text-tertiary">/</span>}
                  <Link
                    href={breadcrumb.href}
                    className={`
                      transition-colors
                      ${
                        idx === breadcrumbs.length - 1
                          ? "text-primary font-semibold"
                          : "text-text-secondary hover:text-primary"
                      }
                    `}
                  >
                    {breadcrumb.label}
                  </Link>
                </div>
              ))}
            </nav>
            {/* <div className="text-xs text-text-tertiary">
              {new Date().toLocaleTimeString("en-NG")}
            </div> */}
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-auto">{children}</div>
      </main>
    </div>
  );
}
