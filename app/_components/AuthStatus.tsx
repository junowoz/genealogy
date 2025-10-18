"use client";
import { useAuth } from "./useAuth";

export function AuthStatus() {
  const { session, loading, redirectToLogin } = useAuth();

  if (loading) {
    return (
      <div className="h-7 w-24 animate-pulse rounded-lg bg-muted/20"></div>
    );
  }

  if (session?.displayName) {
    return (
      <div className="flex items-center gap-3">
        <span className="text-xs text-muted">👤 {session.displayName}</span>
        <button
          onClick={async () => {
            await fetch("/api/auth/logout", { method: "POST" });
            window.location.href = "/";
          }}
          className="text-xs underline decoration-dotted underline-offset-4 hover:text-rose-600 transition-colors"
        >
          Sair
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => redirectToLogin()}
      className="rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 transition-opacity"
    >
      Login FamilySearch
    </button>
  );
}
