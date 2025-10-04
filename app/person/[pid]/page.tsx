"use client";
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';

async function fetchHints(pid: string) {
  const res = await fetch(`/api/hints/${encodeURIComponent(pid)}`);
  if (!res.ok) throw new Error('Falha ao carregar hints');
  return res.json();
}

async function fetchAncestry(pid: string) {
  const res = await fetch(`/api/pedigree/${encodeURIComponent(pid)}/ancestry`);
  if (!res.ok) throw new Error('Falha ao carregar ancestry');
  return res.json();
}

async function fetchDesc(pid: string) {
  const res = await fetch(`/api/pedigree/${encodeURIComponent(pid)}/descendancy`);
  if (!res.ok) throw new Error('Falha ao carregar descendancy');
  return res.json();
}

async function fetchChanges(pid: string) {
  const res = await fetch(`/api/person/${encodeURIComponent(pid)}/changes`);
  if (!res.ok) throw new Error('Falha ao carregar changes');
  return res.json();
}

export default function PersonPage({ params }: { params: { pid: string } }) {
  const pid = params.pid;
  const { data: hints } = useQuery({ queryKey: ['hints', pid], queryFn: () => fetchHints(pid) });
  const { data: anc } = useQuery({ queryKey: ['anc', pid], queryFn: () => fetchAncestry(pid) });
  const { data: desc } = useQuery({ queryKey: ['desc', pid], queryFn: () => fetchDesc(pid) });
  const { data: changes } = useQuery({ queryKey: ['chg', pid], queryFn: () => fetchChanges(pid) });

  return (
    <div className="space-y-8">
      <div>
        <Link href="/" className="text-sm text-blue-700 underline underline-offset-2">← Voltar</Link>
      </div>
      <section className="rounded-lg border bg-white p-4 shadow-sm">
        <h2 className="mb-2 text-lg font-medium">Resumo de hints</h2>
        {hints ? (
          <div className="flex items-center gap-4 text-sm">
            <div>Total: <b>{hints.total}</b></div>
            <div>Registros: <b>{hints.recordHints}</b></div>
            <div>Árvore: <b>{hints.treeHints}</b></div>
            <a className="text-blue-700 underline underline-offset-2" href={hints.fsHintsUrl} target="_blank" rel="noreferrer">Analisar no FamilySearch</a>
          </div>
        ) : (
          <div className="text-sm text-gray-600">Carregando…</div>
        )}
      </section>

      <section className="rounded-lg border bg-white p-4 shadow-sm">
        <h2 className="mb-2 text-lg font-medium">Conexões (ancestrais)</h2>
        {anc ? (
          <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
            {Object.values(anc.nodes).map((n: any) => (
              <div key={n.person.id} className="rounded border p-2">
                <div className="font-medium">{n.person.name}</div>
                <div className="text-xs text-gray-600">{n.person.lifespan || '—'}</div>
                <a className="text-xs text-blue-700 underline" href={n.person.fsUrl} target="_blank" rel="noreferrer">Abrir no FS</a>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-sm text-gray-600">Carregando…</div>
        )}
      </section>

      <section className="rounded-lg border bg-white p-4 shadow-sm">
        <h2 className="mb-2 text-lg font-medium">Conexões (descendentes)</h2>
        {desc ? (
          <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
            {Object.values(desc.nodes).map((n: any) => (
              <div key={n.person.id} className="rounded border p-2">
                <div className="font-medium">{n.person.name}</div>
                <div className="text-xs text-gray-600">{n.person.lifespan || '—'}</div>
                <a className="text-xs text-blue-700 underline" href={n.person.fsUrl} target="_blank" rel="noreferrer">Abrir no FS</a>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-sm text-gray-600">Carregando…</div>
        )}
      </section>

      <section className="rounded-lg border bg-white p-4 shadow-sm">
        <h2 className="mb-2 text-lg font-medium">Mudanças recentes</h2>
        {changes ? (
          <div className="divide-y text-sm">
            {changes.changes?.map((c: any) => (
              <div key={c.id} className="py-2">
                <div className="flex items-center justify-between">
                  <div className="font-medium">{c.type}</div>
                  <div className="text-xs text-gray-500">{new Date(c.at).toLocaleString()}</div>
                </div>
                <div className="text-xs text-gray-600">por {c.by}</div>
                {c.field && (
                  <div className="mt-1 text-xs">
                    <span className="text-gray-500">{c.field}:</span> {c.oldValue} → {c.newValue}
                  </div>
                )}
                <a className="text-xs text-blue-700 underline" href={c.fsChangeUrl} target="_blank" rel="noreferrer">Ver no FS</a>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-sm text-gray-600">Carregando…</div>
        )}
      </section>
    </div>
  );
}

