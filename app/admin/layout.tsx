"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    console.log("[AdminLayout] Auth state:", { isLoading, user, role: user?.role });

    if (isLoading) {
      console.log("[AdminLayout] Still loading, returning null");
      return;
    }

    if (!user) {
      console.log("[AdminLayout] No user found, redirecting to /login");
      router.push("/login");
      return;
    }

    if (user.role !== "admin") {
      console.log("[AdminLayout] User role is not admin, redirecting to /:", {
        userRole: user.role,
        expectedRole: "admin",
      });
      router.push("/");
      return;
    }

    console.log("[AdminLayout] Auth check passed, rendering children");
  }, [user, isLoading, router]);

  if (isLoading || !user || user.role !== "admin") {
    console.log("[AdminLayout] Returning null - isLoading:", isLoading, "no user:", !user, "not admin:", user?.role !== "admin");
    return null;
  }

  return <>{children}</>;
}