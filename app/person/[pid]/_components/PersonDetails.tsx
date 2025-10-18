"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Section, Badge } from "../../../../src/ui/components";

async function fetchPersonDetails(pid: string) {
  const res = await fetch(`/api/person/${encodeURIComponent(pid)}`);
  if (res.status === 401)
    throw new Error("Sessão expirada. Refaça o login com FamilySearch.");
  if (!res.ok) throw new Error("Falha ao carregar detalhes da pessoa");
  return res.json();
}

async function fetchPersonRelatives(pid: string) {
  const res = await fetch(`/api/person/${encodeURIComponent(pid)}/relatives`);
  if (res.status === 401)
    throw new Error("Sessão expirada. Refaça o login com FamilySearch.");
  if (!res.ok) throw new Error("Falha ao carregar parentes");
  return res.json();
}

async function fetchHints(pid: string) {
  const res = await fetch(`/api/hints/${encodeURIComponent(pid)}`);
  if (res.status === 401)
    throw new Error("Sessão expirada. Refaça o login com FamilySearch.");
  if (!res.ok) throw new Error("Falha ao carregar hints");
  return res.json();
}

async function fetchAncestry(pid: string) {
  const res = await fetch(`/api/pedigree/${encodeURIComponent(pid)}/ancestry`);
  if (res.status === 401)
    throw new Error("Sessão expirada. Refaça o login com FamilySearch.");
  if (!res.ok) throw new Error("Falha ao carregar ancestry");
  return res.json();
}

async function fetchDesc(pid: string) {
  const res = await fetch(
    `/api/pedigree/${encodeURIComponent(pid)}/descendancy`
  );
  if (res.status === 401)
    throw new Error("Sessão expirada. Refaça o login com FamilySearch.");
  if (!res.ok) throw new Error("Falha ao carregar descendancy");
  return res.json();
}

async function fetchChanges(pid: string) {
  const res = await fetch(`/api/person/${encodeURIComponent(pid)}/changes`);
  if (res.status === 401)
    throw new Error("Sessão expirada. Refaça o login com FamilySearch.");
  if (!res.ok) throw new Error("Falha ao carregar changes");
  return res.json();
}

function extractName(person: any): string {
  const names = person?.names || [];
  if (names.length === 0) return "Nome desconhecido";
  const preferred = names.find((n: any) => n.preferred) || names[0];
  const parts = preferred?.nameForms?.[0]?.parts || [];
  const given = parts.find((p: any) => p.type?.includes("Given"))?.value || "";
  const surname =
    parts.find((p: any) => p.type?.includes("Surname"))?.value || "";
  return `${given} ${surname}`.trim() || "Nome desconhecido";
}

function extractLifespan(person: any): string {
  const facts = person?.facts || [];
  const birth = facts.find((f: any) => f.type?.includes("Birth"));
  const death = facts.find((f: any) => f.type?.includes("Death"));

  const birthYear = birth?.date?.original || birth?.date?.formal || "";
  const deathYear = death?.date?.original || death?.date?.formal || "";

  if (birthYear && deathYear) return `${birthYear} - ${deathYear}`;
  if (birthYear) return `n. ${birthYear}`;
  if (deathYear) return `m. ${deathYear}`;
  return "—";
}

function extractGender(person: any): string {
  const gender = person?.gender?.type;
  if (gender?.includes("Male")) return "Masculino";
  if (gender?.includes("Female")) return "Feminino";
  return "Desconhecido";
}

export default function PersonDetails({ pid }: { pid: string }) {
  const { data: personData, isLoading: loadingPerson } = useQuery({
    queryKey: ["person", pid],
    queryFn: () => fetchPersonDetails(pid),
    staleTime: 5 * 60 * 1000,
  });

  const { data: relatives, isLoading: loadingRelatives } = useQuery({
    queryKey: ["relatives", pid],
    queryFn: () => fetchPersonRelatives(pid),
    staleTime: 5 * 60 * 1000,
  });

  const { data: hints } = useQuery({
    queryKey: ["hints", pid],
    queryFn: () => fetchHints(pid),
    staleTime: 5 * 60 * 1000,
  });

  const { data: anc } = useQuery({
    queryKey: ["anc", pid],
    queryFn: () => fetchAncestry(pid),
    staleTime: 5 * 60 * 1000,
  });

  const { data: desc } = useQuery({
    queryKey: ["desc", pid],
    queryFn: () => fetchDesc(pid),
    staleTime: 5 * 60 * 1000,
  });

  const { data: changes } = useQuery({
    queryKey: ["chg", pid],
    queryFn: () => fetchChanges(pid),
    staleTime: 5 * 60 * 1000,
  });

  const person = personData?.person;
  const personName = person ? extractName(person) : "Carregando...";
  const lifespan = person ? extractLifespan(person) : "";

  return (
    <div className="space-y-8">
      <div>
        <Link href="/" className="text-sm underline underline-offset-2">
          ← Voltar
        </Link>
      </div>

      {/* Person Header */}
      <Section title={personName} description={`${pid} • ${lifespan}`}>
        {loadingPerson ? (
          <div className="text-sm text-muted">Carregando detalhes...</div>
        ) : person ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <h3 className="text-sm font-semibold mb-2">
                  Informações Básicas
                </h3>
                <dl className="space-y-1 text-sm">
                  <div className="flex gap-2">
                    <dt className="text-muted min-w-20">Gênero:</dt>
                    <dd>{extractGender(person)}</dd>
                  </div>
                  <div className="flex gap-2">
                    <dt className="text-muted min-w-20">Living:</dt>
                    <dd>{person.living ? "Sim" : "Não"}</dd>
                  </div>
                </dl>
              </div>

              <div>
                <h3 className="text-sm font-semibold mb-2">Nomes</h3>
                <ul className="space-y-1 text-sm">
                  {person.names?.map((name: any, idx: number) => (
                    <li key={idx} className="flex gap-2">
                      <span className="text-muted">
                        {name.preferred ? "★" : "•"}
                      </span>
                      <span>{name.nameForms?.[0]?.fullText || "—"}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold mb-2">Fatos e Eventos</h3>
              <div className="space-y-2">
                {person.facts?.map((fact: any, idx: number) => (
                  <div
                    key={idx}
                    className="border-l-2 border-border pl-3 text-sm"
                  >
                    <div className="font-medium">
                      {fact.type
                        ?.split("/")
                        .pop()
                        ?.replace(/([A-Z])/g, " $1")
                        .trim()}
                    </div>
                    {fact.date && (
                      <div className="text-muted">
                        {fact.date.original || fact.date.formal}
                      </div>
                    )}
                    {fact.place && (
                      <div className="text-muted">{fact.place.original}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div>
              <a
                href={`https://www.familysearch.org/tree/person/details/${pid}`}
                target="_blank"
                rel="noreferrer"
                className="text-sm underline underline-offset-2"
              >
                Ver completo no FamilySearch →
              </a>
            </div>
          </div>
        ) : (
          <div className="text-sm text-red-600">Erro ao carregar pessoa</div>
        )}
      </Section>

      {/* Relatives */}
      <Section title="Parentes Diretos" description="Pais, cônjuges e filhos">
        {loadingRelatives ? (
          <div className="text-sm text-muted">Carregando parentes...</div>
        ) : relatives ? (
          <div className="space-y-4">
            {relatives.parents?.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-2">
                  Pais ({relatives.parents.length})
                </h4>
                <div className="grid gap-2 md:grid-cols-2">
                  {relatives.parents.map((parent: any) => (
                    <Link
                      key={parent.id}
                      href={`/person/${parent.id}`}
                      className="block p-3 rounded-lg border border-border hover:border-foreground transition-colors"
                    >
                      <div className="font-medium">{extractName(parent)}</div>
                      <div className="text-xs text-muted">
                        {extractLifespan(parent)}
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {relatives.spouses?.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-2">
                  Cônjuges ({relatives.spouses.length})
                </h4>
                <div className="grid gap-2 md:grid-cols-2">
                  {relatives.spouses.map((spouse: any) => (
                    <Link
                      key={spouse.id}
                      href={`/person/${spouse.id}`}
                      className="block p-3 rounded-lg border border-border hover:border-foreground transition-colors"
                    >
                      <div className="font-medium">{extractName(spouse)}</div>
                      <div className="text-xs text-muted">
                        {extractLifespan(spouse)}
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {relatives.children?.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-2">
                  Filhos ({relatives.children.length})
                </h4>
                <div className="grid gap-2 md:grid-cols-3">
                  {relatives.children.map((child: any) => (
                    <Link
                      key={child.id}
                      href={`/person/${child.id}`}
                      className="block p-3 rounded-lg border border-border hover:border-foreground transition-colors"
                    >
                      <div className="font-medium text-sm">
                        {extractName(child)}
                      </div>
                      <div className="text-xs text-muted">
                        {extractLifespan(child)}
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {!relatives.parents?.length &&
              !relatives.spouses?.length &&
              !relatives.children?.length && (
                <div className="text-sm text-muted">
                  Nenhum parente direto encontrado
                </div>
              )}
          </div>
        ) : (
          <div className="text-sm text-muted">Carregando...</div>
        )}
      </Section>

      <Section
        title="Resumo de hints"
        description="Sempre analisados no FamilySearch (redirect oficial)."
      >
        {hints ? (
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <Badge tone="success">Total {hints.total}</Badge>
            <Badge>Registros {hints.recordHints}</Badge>
            <Badge>Árvore {hints.treeHints}</Badge>
            <a
              className="text-sm underline underline-offset-2"
              href={hints.fsHintsUrl}
              target="_blank"
              rel="noreferrer"
            >
              Analisar no FamilySearch
            </a>
          </div>
        ) : (
          <div className="text-sm text-muted">Carregando…</div>
        )}
      </Section>

      <Section
        title="Conexões (ancestrais)"
        description="Ancestrais diretos e parentes próximos do candidato."
      >
        {anc ? (
          <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
            {Object.values(anc.nodes).map((n: any) => (
              <div
                key={n.person.id}
                className="rounded-lg border border-border p-3"
              >
                <div className="font-medium">{n.person.name}</div>
                <div className="text-xs text-muted">
                  {n.person.lifespan || "—"}
                </div>
                <a
                  className="text-xs underline"
                  href={n.person.fsUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  Abrir no FS
                </a>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-sm text-muted">Carregando…</div>
        )}
      </Section>

      <Section
        title="Conexões (descendentes)"
        description="Descendentes diretos para explorar caminhos prováveis."
      >
        {desc ? (
          <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
            {Object.values(desc.nodes).map((n: any) => (
              <div
                key={n.person.id}
                className="rounded-lg border border-border p-3"
              >
                <div className="font-medium">{n.person.name}</div>
                <div className="text-xs text-muted">
                  {n.person.lifespan || "—"}
                </div>
                <a
                  className="text-xs underline"
                  href={n.person.fsUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  Abrir no FS
                </a>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-sm text-muted">Carregando…</div>
        )}
      </Section>

      <Section
        title="Mudanças recentes"
        description="Histórico legível com link para ver detalhes no FamilySearch."
      >
        {changes ? (
          <div className="divide-y text-sm">
            {changes.changes?.map((c: any) => (
              <div key={c.id} className="py-2">
                <div className="flex items-center justify-between">
                  <div className="font-medium">{c.type}</div>
                  <div className="text-xs text-muted">
                    {new Date(c.at).toLocaleString()}
                  </div>
                </div>
                <div className="text-xs text-muted">por {c.by}</div>
                {c.field && (
                  <div className="mt-1 text-xs">
                    <span className="text-muted">{c.field}:</span> {c.oldValue}{" "}
                    → {c.newValue}
                  </div>
                )}
                <a
                  className="text-xs underline"
                  href={c.fsChangeUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  Ver no FS
                </a>
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
