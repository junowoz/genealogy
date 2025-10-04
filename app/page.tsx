"use client";
import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import type { MatchCandidate, Place } from '../src/domain/types';
import { Hero, Section, Button, Input, Label, Badge, Toolbar } from '../src/ui/components';

const SearchSchema = z.object({
  name: z.string().min(1),
  birthYearFrom: z.string().optional(),
  birthYearTo: z.string().optional(),
  placeText: z.string().optional(),
  placeId: z.string().optional(),
});

async function fetchSearch(params: Record<string, string>) {
  const usp = new URLSearchParams(params);
  const res = await fetch(`/api/search?${usp.toString()}`);
  if (!res.ok) throw new Error('Falha na busca');
  return (await res.json()) as { candidates: MatchCandidate[] };
}

async function fetchPlaces(q: string) {
  const res = await fetch(`/api/places?q=${encodeURIComponent(q)}`);
  if (!res.ok) throw new Error('Falha no autocomplete');
  return (await res.json()) as { places: Place[] };
}

function groupByProbability(candidates?: MatchCandidate[]) {
  if (!candidates) return { high: [] as MatchCandidate[], medium: [] as MatchCandidate[], low: [] as MatchCandidate[] };
  const high: MatchCandidate[] = [];
  const medium: MatchCandidate[] = [];
  const low: MatchCandidate[] = [];
  for (const c of candidates) {
    if (c.score >= 0.75) high.push(c);
    else if (c.score >= 0.55) medium.push(c);
    else low.push(c);
  }
  return { high, medium, low };
}

export default function Page() {
  const [form, setForm] = useState({ name: '', birthYearFrom: '', birthYearTo: '', placeText: '', placeId: '' });
  const [submitted, setSubmitted] = useState<Record<string, string> | null>(null);
  const [placeQuery, setPlaceQuery] = useState('');
  const [placeOpen, setPlaceOpen] = useState(false);

  const { data: results, isFetching, error: searchError } = useQuery({
    queryKey: ['search', submitted],
    queryFn: () => fetchSearch(submitted ?? {}),
    enabled: !!submitted,
  });

  const { data: placeData, error: placeError } = useQuery({
    queryKey: ['places', placeQuery],
    queryFn: () => fetchPlaces(placeQuery),
    enabled: placeQuery.length >= 3,
  });

  const grouped = useMemo(() => groupByProbability(results?.candidates), [results]);

  return (
    <div className="space-y-8">
      <Hero />
      <Section title="Busca de pessoa" description="Nome + janela de datas + local normalizado (Place Authority).">
        <form
          className="grid grid-cols-1 gap-3 md:grid-cols-6"
          onSubmit={(e) => {
            e.preventDefault();
            const parsed = SearchSchema.safeParse(form);
            if (!parsed.success) return alert('Preencha ao menos o nome.');
            const data = parsed.data;
            const params: Record<string, string> = { name: data.name };
            if (data.birthYearFrom) params.birthYearFrom = data.birthYearFrom;
            if (data.birthYearTo) params.birthYearTo = data.birthYearTo;
            if (data.placeId) params.placeId = data.placeId;
            else if (data.placeText) params.placeText = data.placeText;
            setSubmitted(params);
          }}
        >
          <div className="md:col-span-2">
            <Label>Nome</Label>
            <Input
              placeholder="Ex.: Inácio de Souza Gouvêa"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div>
            <Label>Ano nasc. de</Label>
            <Input
              inputMode="numeric"
              placeholder="1850"
              value={form.birthYearFrom}
              onChange={(e) => setForm({ ...form, birthYearFrom: e.target.value })}
            />
          </div>
          <div>
            <Label>Ano nasc. até</Label>
            <Input
              inputMode="numeric"
              placeholder="1870"
              value={form.birthYearTo}
              onChange={(e) => setForm({ ...form, birthYearTo: e.target.value })}
            />
          </div>
          <div className="md:col-span-2 relative">
            <Label>Local</Label>
            <Input
              placeholder="Cidade, estado, país"
              value={form.placeText}
              onChange={(e) => {
                const q = e.target.value;
                setForm({ ...form, placeText: q, placeId: '' });
                setPlaceQuery(q);
                setPlaceOpen(q.length >= 3);
              }}
              onFocus={() => setPlaceOpen(form.placeText.length >= 3)}
              onBlur={() => setTimeout(() => setPlaceOpen(false), 150)}
            />
            {placeOpen && placeData?.places?.length ? (
              <div className="absolute z-10 mt-1 max-h-56 w-full overflow-auto rounded-md border bg-white shadow">
                {placeData.places.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    className="block w-full cursor-pointer px-3 py-2 text-left hover:bg-gray-50"
                    onClick={() => {
                      setForm({ ...form, placeText: p.displayName, placeId: p.id });
                      setPlaceOpen(false);
                    }}
                  >
                    <div className="text-sm">{p.displayName}</div>
                    <div className="text-xs text-gray-500">{p.type || 'Localidade'}</div>
                  </button>
                ))}
              </div>
            ) : null}
            {placeError ? <div className="mt-1 text-xs text-rose-700">Erro ao buscar locais</div> : null}
          </div>
          <div className="md:col-span-6">
            <Button type="submit">Buscar</Button>
          </div>
        </form>

        <div className="mt-3 text-xs text-muted">
          Dica: experimente "Inácio de Souza Gouvêa" com local São Paulo.
        </div>
      </Section>

      <Section title="Resultados" description="Candidatos agrupados por probabilidade com explicações do score.">
        <Toolbar>
          <div className="text-sm text-muted">{isFetching ? 'Buscando…' : 'Pronto'}</div>
          {submitted ? (
            <div className="text-xs text-muted">Consulta: {submitted.name}{submitted.placeText ? ` • ${submitted.placeText}` : submitted.placeId ? ` • ${submitted.placeId}` : ''}</div>
          ) : (
            <div className="text-xs text-muted">Faça uma busca para ver candidatos</div>
          )}
        </Toolbar>
        {searchError ? (
          <div className="mt-3 text-sm text-rose-700">Erro na busca: {(searchError as Error).message}</div>
        ) : null}

        {!results?.candidates?.length && submitted ? (
          <div className="mt-4 text-sm text-muted">Nenhum candidato encontrado para os filtros informados.</div>
        ) : null}

        {results?.candidates?.length ? (
          <div className="mt-4 space-y-8">
            {[{ key: 'high', label: 'Alta probabilidade', tone: 'success' as const }, { key: 'medium', label: 'Probabilidade média', tone: 'warning' as const }, { key: 'low', label: 'Baixa probabilidade', tone: 'default' as const }].map((grp) => {
              const items = (grouped as any)[grp.key] as MatchCandidate[];
              if (!items.length) return null;
              return (
                <div key={grp.key}>
                  <div className="mb-3 flex items-center gap-2">
                    <Badge tone={grp.tone}>{grp.label}</Badge>
                    <span className="text-xs text-muted">{items.length} candidato(s)</span>
                  </div>
                  <div className="grid grid-cols-1 gap-3">
                    {items.map((c) => (
                      <div key={c.person.id} className="rounded-xl border border-border bg-white p-4 shadow-card dark:bg-black/30">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <div className="text-lg font-medium">
                              {c.person.name} <span className="text-muted text-sm">({c.person.lifespan || '—'})</span>
                            </div>
                            <div className="mt-1 text-sm text-muted">
                              {c.person.gender ? `${c.person.gender} • ` : ''}
                              {c.person.primaryPlace?.displayName || c.person.primaryPlaceText || 'Local desconhecido'}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-semibold tabular-nums">{c.score.toFixed(2)}</div>
                            <div className="text-xs text-muted">score</div>
                          </div>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {c.explanations.map((e, idx) => (
                            <Badge key={idx}>{e}</Badge>
                          ))}
                        </div>
                        <div className="mt-3 flex items-center gap-3">
                          <a
                            className="text-sm underline underline-offset-2"
                            href={c.person.fsUrl}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Abrir no FamilySearch
                          </a>
                          <a
                            className="text-sm text-muted underline underline-offset-2 hover:text-[hsl(var(--fg))]"
                            href={`./person/${encodeURIComponent(c.person.id)}`}
                          >
                            Ver conexões e hints
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}
      </Section>
    </div>
  );
}
