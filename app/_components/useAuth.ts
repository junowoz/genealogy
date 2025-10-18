"use client";
import { useEffect, useState } from "react";

interface SessionData {
  authenticated: boolean;
  personId?: string;
  displayName?: string;
}

export function useAuth() {
  const [session, setSession] = useState<SessionData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : { authenticated: false }))
      .then((data) => {
        setSession(data);
        setLoading(false);
      })
      .catch(() => {
        setSession({ authenticated: false });
        setLoading(false);
      });
  }, []);

  const redirectToLogin = (returnTo?: string) => {
    const redirectPath = returnTo || window.location.pathname;
    window.location.href = `/api/auth/login?state=web&redirectTo=${encodeURIComponent(
      redirectPath
    )}`;
  };

  return {
    session,
    loading,
    isAuthenticated: session?.authenticated ?? false,
    redirectToLogin,
  };
}
