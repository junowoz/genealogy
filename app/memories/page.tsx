"use client";
import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Section, Button, Badge, Input, Label, Toolbar, Card } from '../../src/ui/components';
import type { IngestResult } from '../../src/domain/memories';

type Job = { id: string; uploadId: string; status: 'queued'|'processing'|'completed'|'failed'; error?: string };

async function uploadFile(file: File) {
  const fd = new FormData();
  fd.append('file', file);
  const res = await fetch('/api/memories/upload', { method: 'POST', body: fd });
  if (!res.ok) throw new Error('Falha no upload');
  return res.json() as Promise<{ upload: { id: string } }>;
}

async function createJob(uploadId: string) {
  const res = await fetch('/api/memories/jobs', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ uploadId }) });
  if (!res.ok) throw new Error('Falha ao criar job');
  return res.json() as Promise<{ job: Job }>;
}

async function fetchJob(id: string) {
  const res = await fetch(`/api/memories/jobs/${encodeURIComponent(id)}`);
  if (!res.ok) throw new Error('Falha ao consultar job');
  return res.json() as Promise<{ job: Job; result?: IngestResult }>;
}

function usePollingJob(jobId?: string) {
  const enabled = !!jobId;
  return useQuery({
    queryKey: ['mem-job', jobId],
    queryFn: () => fetchJob(jobId!),
    enabled,
    refetchInterval: (q) => {
      const data = q.state.data as any;
      const status: string | undefined = data?.job?.status;
      if (!enabled) return false;
      if (status === 'completed' || status === 'failed') return false;
      return 1000;
    },
  });
}

export default function MemoriesPage() {
  const [file, setFile] = useState<File | null>(null);
  const [uploadId, setUploadId] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const upMut = useMutation({ mutationFn: uploadFile, onSuccess: (data) => setUploadId(data.upload.id) });
  const jobMut = useMutation({ mutationFn: createJob, onSuccess: (data) => setJobId(data.job.id) });
  const { data: jobData, isFetching: jobFetching } = usePollingJob(jobId ?? undefined);

  const job = jobData?.job;
  const result = jobData?.result as IngestResult | undefined;

  const canStart = !!file && !upMut.isPending && !jobMut.isPending && !jobId;
  const isDone = job?.status === 'completed';
  const isFailed = job?.status === 'failed';

  const handleStart = async () => {
    if (!file) return;
    const { upload } = await upMut.mutateAsync(file);
    await jobMut.mutateAsync(upload.id);
  };

  const resetAll = () => {
    setFile(null); setUploadId(null); setJobId(null);
    inputRef.current?.value && (inputRef.current.value = '');
  };

  return (
    <div className="space-y-8">
      <Section title="Memories AI Ingestor" description="Envie uma imagem/PDF e eu extraio nomes, datas e lugares; sugiro pessoas do Tree e crio uma citação (read‑only, com redirects para o FamilySearch).">
        <div
          className={`relative mt-2 rounded-xl border-2 border-dashed p-8 text-center ${dragOver ? 'border-[hsl(var(--accent))] bg-black/5 dark:bg-white/10' : 'border-border'}`}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault(); setDragOver(false);
            const f = e.dataTransfer.files?.[0]; if (f) setFile(f);
          }}
        >
          <div className="text-sm text-muted">Arraste um arquivo aqui ou</div>
          <div className="mt-2">
            <input ref={inputRef} type="file" accept="image/*,.pdf" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            <Button variant="outline" onClick={() => inputRef.current?.click()}>Selecionar arquivo</Button>
          </div>
          {file ? (
            <div className="mt-4 text-xs text-muted">Selecionado: {file.name} • {(file.size/1024/1024).toFixed(2)} MB • {file.type || 'desconhecido'}</div>
          ) : null}
        </div>

        <div className="mt-4 flex items-center gap-3">
          <Button onClick={handleStart} disabled={!canStart}>Iniciar processamento</Button>
          <Button variant="ghost" onClick={resetAll}>Limpar</Button>
          {upMut.isPending || jobMut.isPending || jobFetching ? <span className="text-sm text-muted">Processando…</span> : null}
          {job ? <span className="text-sm text-muted">Status: {job.status}</span> : null}
        </div>

        {isFailed && job?.error ? (
          <div className="mt-3 text-sm text-rose-700">Erro: {job.error}</div>
        ) : null}
      </Section>

      {isDone && result ? (
        <Section title="Resultado" description="Extração (OCR/NER), sugestões de pessoas e citação sugerida.">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <Card className="p-4 md:col-span-2">
              <div className="mb-3 flex items-center justify-between">
                <h3>Texto (OCR)</h3>
                <Badge>páginas {result.ocr.pages.length}</Badge>
              </div>
              <div className="space-y-3 text-sm">
                {result.ocr.pages.map((p) => (
                  <div key={p.page} className="rounded border border-border p-3">
                    <div className="mb-1 text-xs text-muted">Página {p.page}</div>
                    <div className="whitespace-pre-wrap">{p.text}</div>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-4">
              <h3 className="mb-3">Entidades</h3>
              <div className="space-y-2 text-sm">
                {result.ner.entities.map((e) => (
                  <div key={e.id} className="rounded border border-border p-2">
                    <div className="flex items-center justify-between">
                      <div className="font-medium">{e.text}</div>
                      <Badge tone={e.type === 'PERSON_NAME' ? 'success' : e.type === 'PLACE' ? 'warning' : 'default'}>{e.type}</Badge>
                    </div>
                    <div className="mt-1 text-xs text-muted">confiança {(e.confidence*100).toFixed(0)}% • pág {e.page}</div>
                    {e.type === 'PLACE' && (e as any).placeId ? (
                      <div className="mt-1 text-xs">placeId: {(e as any).placeId}</div>
                    ) : null}
                  </div>
                ))}
                {!result.ner.entities.length ? <div className="text-xs text-muted">Nenhuma entidade reconhecida</div> : null}
              </div>
            </Card>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-3">
            <Card className="p-4 md:col-span-2">
              <div className="mb-3 flex items-center justify-between"><h3>Sugestões de pessoas</h3></div>
              {!result.suggestions.length ? (
                <div className="text-sm text-muted">Nenhuma sugestão encontrada</div>
              ) : (
                <div className="space-y-3">
                  {result.suggestions.map((s, i) => (
                    <div key={i} className="rounded-xl border border-border p-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="font-medium">{s.name}</div>
                          <div className="mt-1 flex flex-wrap gap-2">
                            {s.explanations.map((ex, j) => (<Badge key={j}>{ex}</Badge>))}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-semibold tabular-nums">{(s.score*100).toFixed(0)}%</div>
                          <div className="text-xs text-muted">confiança</div>
                        </div>
                      </div>
                      <div className="mt-3 flex items-center gap-3">
                        {s.fsUrl ? <a className="text-sm underline underline-offset-2" href={s.fsUrl} target="_blank" rel="noreferrer">Abrir no FamilySearch</a> : null}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <Card className="p-4">
              <h3 className="mb-3">Citação sugerida</h3>
              <div className="space-y-2 text-sm">
                <div><span className="text-muted">Título: </span>{result.citation.title}</div>
                {result.citation.note ? <div><span className="text-muted">Nota: </span>{result.citation.note}</div> : null}
                {result.citation.url ? <div><span className="text-muted">URL: </span>{result.citation.url}</div> : null}
                <div className="pt-2">
                  <Button variant="outline" onClick={() => navigator.clipboard.writeText(`${result.citation.title}${result.citation.note ? ' — '+result.citation.note : ''}${result.citation.url ? ' ('+result.citation.url+')' : ''}`)}>Copiar citação</Button>
                </div>
                <div className="text-xs text-muted">Anexar/confirmar deve ser feito na interface oficial do FS (redirect).</div>
              </div>
            </Card>
          </div>
        </Section>
      ) : null}
    </div>
  );
}

