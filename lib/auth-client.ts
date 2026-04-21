"use client";

import type { AuthUserPayload } from "@/lib/jwt";

export const AUTH_TOKEN_KEY = "authToken";

export interface ClientAuthPayload extends AuthUserPayload {
  iat: number;
  exp: number;
}

function base64UrlDecode(value: string): string {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padding = normalized.length % 4 === 0 ? "" : "=".repeat(4 - (normalized.length % 4));

  return atob(normalized + padding);
}

export function readAuthToken(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage.getItem(AUTH_TOKEN_KEY);
}

export function saveAuthToken(token: string): void {
  window.localStorage.setItem(AUTH_TOKEN_KEY, token);
}

export function clearAuthToken(): void {
  window.localStorage.removeItem(AUTH_TOKEN_KEY);
}

export function decodeClientAuthToken(token: string): ClientAuthPayload | null {
  const parts = token.split(".");

  if (parts.length !== 3) {
    return null;
  }

  try {
    const payload = JSON.parse(base64UrlDecode(parts[1])) as ClientAuthPayload;

    if (
      typeof payload.id !== "string" ||
      typeof payload.email !== "string" ||
      typeof payload.name !== "string" ||
      typeof payload.role !== "string" ||
      typeof payload.iat !== "number" ||
      typeof payload.exp !== "number"
    ) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

export function isAuthTokenExpired(token: string): boolean {
  const payload = decodeClientAuthToken(token);

  if (!payload) {
    return true;
  }

  return payload.exp <= Math.floor(Date.now() / 1000);
}

export function getAuthUserFromToken(token: string): AuthUserPayload | null {
  const payload = decodeClientAuthToken(token);

  if (!payload || payload.exp <= Math.floor(Date.now() / 1000)) {
    return null;
  }

  return {
    id: payload.id,
    email: payload.email,
    name: payload.name,
    role: payload.role,
    institutionId: payload.institutionId,
    institutionName: payload.institutionName,
  };
}

export function authFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  const token = readAuthToken();

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  return fetch(input, {
    ...init,
    headers,
  });
}

export function authStreamUrl(pathname: string): string {
  if (typeof window === "undefined") {
    return pathname;
  }

  const token = readAuthToken();
  if (!token) {
    return pathname;
  }

  const url = new URL(pathname, window.location.origin);
  url.searchParams.set("authToken", token);
  return url.toString();
}
