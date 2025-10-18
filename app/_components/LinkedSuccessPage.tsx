"use client";

import { useEffect } from "react";

export default function LinkedSuccessPage({ state }: { state: string }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        window.close();
      } catch {}
    }, 1000); // faster auto-close
    return () => clearTimeout(timer);
  }, []);

  const stateLabel = state.startsWith("mcp")
    ? "ChatGPT (MCP)"
    : state === "web"
    ? "site"
    : state;

  return (
    <main className="flex items-center justify-center bg-transparent px-4 py-8">
      <div className="w-full max-w-sm rounded-2xl bg-white/95 ring-1 ring-black/5 px-6 py-6 shadow-md text-center">
        <div className="flex justify-end">
          <button
            onClick={() => {
              try {
                window.close();
              } catch {
                window.location.href = "/";
              }
            }}
            aria-label="Fechar"
            className="text-xs text-muted hover:text-rose-600"
          >
            Fechar
          </button>
        </div>

        <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 text-lg font-semibold">
          ✓
        </div>

        <h1 className="text-lg font-semibold text-slate-900">
          Conexão concluída
        </h1>

        <p className="mt-2 text-sm text-slate-600">
          Sua conta FamilySearch foi vinculada ao fluxo{" "}
          <strong className="text-slate-800">{stateLabel}</strong>.
        </p>

        <p className="mt-3 text-xs text-slate-500">
          Esta janela fechará em 1s.
        </p>
      </div>
    </main>
  );
}
