"use client";

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

export default function LinkedPage() {
  const sp = useSearchParams();
  const state = sp?.get('state') ?? 'web';

  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        window.close();
      } catch {
        // ignore if window cannot close itself
      }
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  const stateLabel = state.startsWith('mcp') ? 'ChatGPT (MCP)' : state === 'web' ? 'site' : state;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-50 px-6 text-center text-slate-800">
      <div className="rounded-3xl bg-white/80 px-8 py-10 shadow-lg">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">
          ✓
        </div>
        <h1 className="text-2xl font-semibold text-slate-900">Conexão concluída</h1>
        <p className="mt-3 text-sm text-slate-600">
          Sua conta FamilySearch está vinculada ao fluxo <strong>{stateLabel}</strong>. Você pode fechar esta janela e voltar para a origem.
        </p>
        <p className="mt-6 text-xs text-slate-500">
          Caso a janela não feche automaticamente, feche manualmente após confirmar no aplicativo.
        </p>
      </div>
      <a
        className="text-xs text-slate-500 underline underline-offset-4"
        href="/"
      >
        Voltar para genealogy.junowoz.com
      </a>
    </main>
  );
}
