"use client";
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Section, Badge } from '../../../src/ui/components';

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
        <Link href="/" className="text-sm underline underline-offset-2">← Voltar</Link>
      </div>

      <Section title="Resumo de hints" description="Sempre analisados no FamilySearch (redirect oficial).">
        {hints ? (
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <Badge tone="success">Total {hints.total}</Badge>
            <Badge>Registros {hints.recordHints}</Badge>
            <Badge>Árvore {hints.treeHints}</Badge>
            <a className="text-sm underline underline-offset-2" href={hints.fsHintsUrl} target="_blank" rel="noreferrer">Analisar no FamilySearch</a>
          </div>
        ) : (
          <div className="text-sm text-muted">Carregando…</div>
        )}
      </Section>

      <Section title="Conexões (ancestrais)" description="Ancestrais diretos e parentes próximos do candidato.">
        {anc ? (
          <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
            {Object.values(anc.nodes).map((n: any) => (
              <div key={n.person.id} className="rounded-lg border border-border p-3">
                <div className="font-medium">{n.person.name}</div>
                <div className="text-xs text-muted">{n.person.lifespan || '—'}</div>
                <a className="text-xs underline" href={n.person.fsUrl} target="_blank" rel="noreferrer">Abrir no FS</a>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-sm text-muted">Carregando…</div>
        )}
      </Section>

      <Section title="Conexões (descendentes)" description="Descendentes diretos para explorar caminhos prováveis.">
        {desc ? (
          <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
            {Object.values(desc.nodes).map((n: any) => (
              <div key={n.person.id} className="rounded-lg border border-border p-3">
                <div className="font-medium">{n.person.name}</div>
                <div className="text-xs text-muted">{n.person.lifespan || '—'}</div>
                <a className="text-xs underline" href={n.person.fsUrl} target="_blank" rel="noreferrer">Abrir no FS</a>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-sm text-muted">Carregando…</div>
        )}
      </Section>

      <Section title="Mudanças recentes" description="Histórico legível com link para ver detalhes no FamilySearch.">
        {changes ? (
          <div className="divide-y text-sm">
            {changes.changes?.map((c: any) => (
              <div key={c.id} className="py-2">
                <div className="flex items-center justify-between">
                  <div className="font-medium">{c.type}</div>
                  <div className="text-xs text-muted">{new Date(c.at).toLocaleString()}</div>
                </div>
                <div className="text-xs text-muted">por {c.by}</div>
                {c.field && (
                  <div className="mt-1 text-xs">
                    <span className="text-muted">{c.field}:</span> {c.oldValue} → {c.newValue}
                  </div>
                )}
                <a className="text-xs underline" href={c.fsChangeUrl} target="_blank" rel="noreferrer">Ver no FS</a>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-sm text-muted">Carregando…</div>
        )}
      </Section>
    </div>
  );
}
