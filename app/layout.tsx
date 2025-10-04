import './globals.css';
import type { Metadata } from 'next';
import { ReactQueryClientProvider } from '../src/ui/ReactQueryClientProvider';
import { Container } from '../src/ui/components';
import { ThemeToggle } from '../src/ui/components';

export const metadata: Metadata = {
  title: 'Genearchive — Painel de Pesquisa',
  description: 'MVP read-only de pesquisa & conexões com mocks',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen">
        <ReactQueryClientProvider>
          <Container>
            <header className="mb-6 flex items-center justify-between gap-4">
              <div>
                <div className="text-xl font-semibold tracking-tight">Genearchive</div>
                <div className="text-xs text-muted">MVP • Read-only • Mocks</div>
              </div>
              <div className="flex items-center gap-2">
                <a className="text-sm underline decoration-dotted underline-offset-4" href="https://www.familysearch.org/" target="_blank" rel="noreferrer">Abrir FamilySearch</a>
                <ThemeToggle />
              </div>
            </header>
            {children}
            <footer className="mt-10 border-t border-border pt-6 text-xs text-muted">
              Read-only. Hints e matches sempre analisados no FamilySearch via redirect.
            </footer>
          </Container>
        </ReactQueryClientProvider>
      </body>
    </html>
  );
}
