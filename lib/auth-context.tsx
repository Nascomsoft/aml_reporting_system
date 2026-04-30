"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  clearAuthToken,
  decodeClientAuthToken,
  readAuthToken,
  saveAuthToken,
  type ClientAuthPayload,
} from "@/lib/auth-client";

interface AuthContextValue {
  user: ClientAuthPayload | null;
  token: string | null;
  isLoading: boolean;
  login: (token: string) => boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authState, setAuthState] = useState<{
    user: ClientAuthPayload | null;
    token: string | null;
    isLoading: boolean;
  }>({
    user: null,
    token: null,
    isLoading: true,
  });

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const storedToken = readAuthToken();

      if (!storedToken) {
        setAuthState({ user: null, token: null, isLoading: false });
        return;
      }

      const decoded = decodeClientAuthToken(storedToken);

      if (!decoded || decoded.exp <= Math.floor(Date.now() / 1000)) {
        clearAuthToken();
        setAuthState({ user: null, token: null, isLoading: false });
        return;
      }

      setAuthState({ user: decoded, token: storedToken, isLoading: false });
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  useEffect(() => {
    function handleStorage(event: StorageEvent) {
      if (event.key !== "authToken") {
        return;
      }

      const nextToken = event.newValue;

      if (!nextToken) {
        setAuthState({ user: null, token: null, isLoading: false });
        return;
      }

      const decoded = decodeClientAuthToken(nextToken);
      if (!decoded || decoded.exp <= Math.floor(Date.now() / 1000)) {
        clearAuthToken();
        setAuthState({ user: null, token: null, isLoading: false });
        return;
      }

      setAuthState({ user: decoded, token: nextToken, isLoading: false });
    }

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const login = (nextToken: string) => {
    const decoded = decodeClientAuthToken(nextToken);

    if (!decoded || decoded.exp <= Math.floor(Date.now() / 1000)) {
      clearAuthToken();
      setAuthState({ user: null, token: null, isLoading: false });
      return false;
    }

    saveAuthToken(nextToken);
    setAuthState({ user: decoded, token: nextToken, isLoading: false });
    return true;
  };

  const logout = () => {
    clearAuthToken();
    setAuthState({ user: null, token: null, isLoading: false });
  };

  return (
    <AuthContext.Provider value={{ ...authState, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
}
