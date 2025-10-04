"use client";
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import type { MatchCandidate, Place } from '../src/domain/types';

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

export default function Page() {
  const [form, setForm] = useState({ name: '', birthYearFrom: '', birthYearTo: '', placeText: '', placeId: '' });
  const [submitted, setSubmitted] = useState<Record<string, string> | null>(null);
  const [placeQuery, setPlaceQuery] = useState('');
  const [placeOpen, setPlaceOpen] = useState(false);

  const { data: results, isFetching } = useQuery({
    queryKey: ['search', submitted],
    queryFn: () => fetchSearch(submitted ?? {}),
    enabled: !!submitted,
  });

  const { data: placeData } = useQuery({
    queryKey: ['places', placeQuery],
    queryFn: () => fetchPlaces(placeQuery),
    enabled: placeQuery.length >= 3,
  });

  return (
    <div className="space-y-8">
      <section className="rounded-lg border bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-lg font-medium">Busca de pessoa</h2>
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
            <label className="mb-1 block text-sm font-medium">Nome</label>
            <input
              className="w-full rounded-md border px-3 py-2"
              placeholder="Ex.: Inácio de Souza Gouvêa"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Ano nasc. de</label>
            <input
              inputMode="numeric"
              className="w-full rounded-md border px-3 py-2"
              placeholder="1850"
              value={form.birthYearFrom}
              onChange={(e) => setForm({ ...form, birthYearFrom: e.target.value })}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Ano nasc. até</label>
            <input
              inputMode="numeric"
              className="w-full rounded-md border px-3 py-2"
              placeholder="1870"
              value={form.birthYearTo}
              onChange={(e) => setForm({ ...form, birthYearTo: e.target.value })}
            />
          </div>
          <div className="md:col-span-2 relative">
            <label className="mb-1 block text-sm font-medium">Local</label>
            <input
              className="w-full rounded-md border px-3 py-2"
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
          </div>
          <div className="md:col-span-6">
            <button className="rounded-md bg-black px-4 py-2 text-white hover:bg-gray-800">Buscar</button>
          </div>
        </form>
      </section>

      <section className="space-y-4">
        {isFetching && <div className="text-sm text-gray-500">Buscando…</div>}
        {results?.candidates?.map((c) => (
          <div key={c.person.id} className="rounded-lg border bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-lg font-medium">
                  {c.person.name} <span className="text-gray-500 text-sm">({c.person.lifespan || '—'})</span>
                </div>
                <div className="mt-1 text-sm text-gray-600">
                  {c.person.gender ? `${c.person.gender} • ` : ''}
                  {c.person.primaryPlace?.displayName || c.person.primaryPlaceText || 'Local desconhecido'}
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-semibold tabular-nums">{c.score.toFixed(2)}</div>
                <div className="text-xs text-gray-500">score</div>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {c.explanations.map((e, idx) => (
                <span key={idx} className="chip border-gray-200 bg-gray-50 text-gray-700">{e}</span>
              ))}
            </div>
            <div className="mt-3 flex items-center gap-3">
              <a
                className="text-sm text-blue-700 underline underline-offset-2 hover:text-blue-800"
                href={c.person.fsUrl}
                target="_blank"
                rel="noreferrer"
              >
                Abrir no FamilySearch
              </a>
              <a
                className="text-sm text-gray-700 underline underline-offset-2 hover:text-gray-900"
                href={`./person/${encodeURIComponent(c.person.id)}`}
              >
                Ver conexões e hints
              </a>
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}

