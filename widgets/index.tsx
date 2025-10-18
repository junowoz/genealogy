import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";

type Candidate = {
  person?: {
    id: string;
    name?: string;
    lifespan?: string;
    primaryPlaceText?: string;
    fsUrl?: string;
  };
  score?: number;
  explanations?: string[];
};

type SearchPayload = {
  query?: Record<string, unknown>;
  total?: number;
  candidates?: Candidate[];
};

const getOpenAi = (): any => (window as any).openai;

function useOpenAiBridge() {
  const [globals, setGlobals] = useState(() => {
    const bridge = getOpenAi();
    return {
      toolOutput: (bridge?.toolOutput ?? {}) as SearchPayload,
      toolInput: bridge?.toolInput ?? {},
      widgetState: bridge?.widgetState ?? {},
      displayMode: bridge?.displayMode ?? "inline",
    };
  });

  useEffect(() => {
    const handler = () => {
      const bridge = getOpenAi();
      setGlobals({
        toolOutput: (bridge?.toolOutput ?? {}) as SearchPayload,
        toolInput: bridge?.toolInput ?? {},
        widgetState: bridge?.widgetState ?? {},
        displayMode: bridge?.displayMode ?? "inline",
      });
    };
    window.addEventListener("openai:set_globals", handler as any);
    return () =>
      window.removeEventListener("openai:set_globals", handler as any);
  }, []);

  return globals;
}

function App() {
  const { toolOutput, widgetState } = useOpenAiBridge();
  const [filter, setFilter] = useState<string>(widgetState?.filter ?? "");

  useEffect(() => {
    setFilter(widgetState?.filter ?? "");
  }, [widgetState?.filter]);

  const candidates = useMemo(() => {
    const list = toolOutput?.candidates ?? [];
    if (!filter) return list;
    return list.filter((candidate) => {
      const name = candidate.person?.name ?? "";
      return name.toLowerCase().includes(filter.toLowerCase());
    });
  }, [toolOutput?.candidates, filter]);

  const onRefresh = async () => {
    const bridge = getOpenAi();
    try {
      await bridge?.setWidgetState?.({ ...(widgetState ?? {}), filter });
    } catch (err) {
      console.warn("widget state error", err);
    }
    if (bridge?.callTool) {
      await bridge.callTool("fs.search_people", bridge.toolInput ?? {});
    }
  };

  const total = toolOutput?.total ?? candidates.length;

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div>
          <h3 style={styles.title}>Genealogy · {total} candidato(s)</h3>
          <p style={styles.subtitle}>
            Filtro rápido apenas no widget. Use o MCP para refinar a consulta.
          </p>
        </div>
        <div style={styles.actions}>
          <input
            placeholder="Filtrar nome"
            aria-label="Filtrar por nome"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            style={styles.input}
          />
          <button onClick={onRefresh} style={styles.button}>
            Atualizar
          </button>
        </div>
      </header>

      <main style={styles.tableWrapper}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Score</th>
              <th style={styles.th}>Nome</th>
              <th style={styles.th}>Vida</th>
              <th style={styles.th}>Local</th>
              <th style={styles.th}>Explicações</th>
            </tr>
          </thead>
          <tbody>
            {(candidates ?? []).map((candidate, index) => {
              const pid = candidate.person?.id ?? `row-${index}`;
              return (
                <tr key={pid}>
                  <td style={styles.td}>
                    <span style={styles.badge}>
                      {Math.round((candidate.score ?? 0) * 100)}
                    </span>
                  </td>
                  <td style={styles.td}>{candidate.person?.name ?? "—"}</td>
                  <td style={styles.td}>{candidate.person?.lifespan ?? "—"}</td>
                  <td style={styles.td}>
                    {candidate.person?.primaryPlaceText ?? "—"}
                  </td>
                  <td style={styles.td}>
                    <span style={styles.explanations}>
                      {(candidate.explanations ?? []).map((chip, chipIndex) => (
                        <span
                          key={`${pid}-chip-${chipIndex}`}
                          style={styles.chip}
                        >
                          {chip}
                        </span>
                      ))}
                    </span>
                    {candidate.person?.fsUrl ? (
                      <div style={{ marginTop: 6 }}>
                        <a
                          href={candidate.person.fsUrl}
                          target="_blank"
                          rel="noreferrer"
                          style={styles.link}
                        >
                          Abrir no FamilySearch ↗
                        </a>
                      </div>
                    ) : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </main>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    fontFamily: "Inter, system-ui, -apple-system, Segoe UI, sans-serif",
    padding: 16,
    color: "#1f2937",
  },
  header: {
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "space-between",
    alignItems: "flex-end",
    gap: 12,
    marginBottom: 16,
  },
  title: { margin: 0, fontSize: 18, fontWeight: 600 },
  subtitle: { margin: 0, fontSize: 12, color: "#6b7280" },
  actions: { display: "flex", gap: 8, alignItems: "center" },
  input: {
    padding: "6px 10px",
    border: "1px solid #d1d5db",
    borderRadius: 8,
    fontSize: 13,
  },
  button: {
    padding: "6px 12px",
    borderRadius: 8,
    border: "1px solid #9ca3af",
    background: "#111827",
    color: "#fff",
    cursor: "pointer",
  },
  tableWrapper: { overflowX: "auto" },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: 13,
  },
  th: {
    textAlign: "left",
    padding: "8px 6px",
    borderBottom: "1px solid #e5e7eb",
    color: "#6b7280",
    textTransform: "uppercase",
    fontSize: 11,
    letterSpacing: "0.05em",
  },
  td: {
    padding: "10px 6px",
    borderBottom: "1px solid #f3f4f6",
    verticalAlign: "top",
  },
  badge: {
    display: "inline-flex",
    justifyContent: "center",
    alignItems: "center",
    minWidth: 36,
    padding: "4px 8px",
    borderRadius: 999,
    background: "#eef2ff",
    color: "#312e81",
    fontWeight: 600,
    fontSize: 12,
  },
  explanations: {
    display: "flex",
    flexWrap: "wrap",
    gap: 6,
  },
  chip: {
    fontSize: 11,
    background: "#f3f4f6",
    borderRadius: 999,
    padding: "3px 8px",
    color: "#4b5563",
  },
  link: {
    fontSize: 12,
    color: "#2563eb",
    textDecoration: "none",
  },
};

function mount() {
  const container = document.getElementById("genealogy-widget");
  if (!container) return;
  const root = createRoot(container);
  root.render(<App />);
}

mount();
