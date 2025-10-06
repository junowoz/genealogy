import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';

type Candidate = {
  pid: string;
  fullName?: string;
  birth?: { date?: string; place?: string };
  death?: { date?: string; place?: string };
  place?: string;
  score?: number;
};

type SearchOutput = {
  q?: string;
  total?: number;
  candidates?: Candidate[];
};

function useOpenaiGlobals() {
  const [globals, setGlobals] = useState({
    toolInput: (window.openai?.toolInput ?? {}) as any,
    toolOutput: (window.openai?.toolOutput ?? {}) as SearchOutput,
    widgetState: (window.openai?.widgetState ?? {}) as any,
    displayMode: window.openai?.displayMode ?? 'inline',
    maxHeight: window.openai?.maxHeight ?? undefined,
  });

  useEffect(() => {
    const onSet = () => {
      setGlobals({
        toolInput: window.openai?.toolInput ?? {},
        toolOutput: (window.openai?.toolOutput ?? {}) as SearchOutput,
        widgetState: window.openai?.widgetState ?? {},
        displayMode: window.openai?.displayMode ?? 'inline',
        maxHeight: window.openai?.maxHeight,
      });
    };
    window.addEventListener('openai:set_globals', onSet as any);
    return () => window.removeEventListener('openai:set_globals', onSet as any);
  }, []);

  return globals;
}

function App() {
  const { toolInput, toolOutput, widgetState } = useOpenaiGlobals();
  const [filter, setFilter] = useState<string>(widgetState?.filter ?? '');

  useEffect(() => {
    setFilter(widgetState?.filter ?? '');
  }, [widgetState?.filter]);

  const candidates = useMemo(() => {
    const list = toolOutput?.candidates ?? [];
    if (!filter) return list;
    return list.filter(c => (c.fullName ?? '').toLowerCase().includes(filter.toLowerCase()));
  }, [toolOutput?.candidates, filter]);

  const onRefresh = async () => {
    try {
      await window.openai?.setWidgetState?.({ ...(widgetState ?? {}), filter });
    } catch {}
    if (window.openai?.callTool) {
      await window.openai.callTool('search_person', toolInput ?? {});
    }
  };

  return (
    <div style={{ padding: 12, fontFamily: 'Inter, system-ui, Arial, sans-serif' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <h3 style={{ margin: 0, flex: 1 }}>Genearchive · {candidates.length} candidatos</h3>
        <input
          aria-label="Filtro por nome"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filtrar nome"
          style={{ padding: '6px 8px', border: '1px solid #ddd', borderRadius: 6 }}
        />
        <button onClick={onRefresh} style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #ccc' }}>Atualizar</button>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 10 }}>
        <thead>
          <tr>
            <th style={th}>Score</th>
            <th style={th}>Nome</th>
            <th style={th}>Nascimento</th>
            <th style={th}>Falecimento</th>
            <th style={th}>Local</th>
            <th style={th}>PID</th>
          </tr>
        </thead>
        <tbody>
          {(candidates ?? []).map((c, i) => (
            <tr key={c.pid ?? String(i)}>
              <td style={td}><span style={badge}>{Math.round((c.score ?? 0) * 100)}</span></td>
              <td style={td}>{c.fullName ?? ''}</td>
              <td style={td}>{[c.birth?.date, c.birth?.place].filter(Boolean).join(' ')}</td>
              <td style={td}>{[c.death?.date, c.death?.place].filter(Boolean).join(' ')}</td>
              <td style={td}>{c.place ?? ''}</td>
              <td style={td}>{c.pid}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const th: React.CSSProperties = { padding: 8, borderBottom: '1px solid #e6e6e6', textAlign: 'left', fontSize: 12, color: '#666', textTransform: 'uppercase' };
const td: React.CSSProperties = { padding: 8, borderBottom: '1px solid #f0f0f0' };
const badge: React.CSSProperties = { fontSize: 12, background: '#eef', color: '#224', padding: '2px 6px', borderRadius: 8 };

const mount = () => {
  const el = document.getElementById('genearchive-root');
  if (!el) return;
  const root = createRoot(el);
  root.render(<App />);
};

mount();

