import './globals.css';
import type { Metadata } from 'next';
import { ReactQueryClientProvider } from '../src/ui/ReactQueryClientProvider';

export const metadata: Metadata = {
  title: 'Genearchive — Painel de Pesquisa',
  description: 'MVP read-only de pesquisa & conexões com mocks',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen">
        <ReactQueryClientProvider>
          <div className="mx-auto max-w-6xl p-6">
            <header className="mb-6 flex items-center justify-between">
              <h1 className="text-2xl font-semibold tracking-tight">Genearchive</h1>
              <nav className="text-sm text-gray-600">MVP • Read-only • Mocks</nav>
            </header>
            {children}
          </div>
        </ReactQueryClientProvider>
      </body>
    </html>
  );
}

