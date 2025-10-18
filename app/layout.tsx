import "./globals.css";
import { ReactQueryClientProvider } from "../src/ui/ReactQueryClientProvider";
import { Container } from "../src/ui/components";
import { ThemeToggle } from "../src/ui/components";

export const metadata = {
  title: "Genealogy — Pesquisa Genealógica",
  description: "Painel unificado com FamilySearch (read-only).",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen">
        <ReactQueryClientProvider>
          <Container>
            <header className="mb-6 flex items-center justify-between gap-4">
              <div>
                <div className="text-xl font-semibold tracking-tight">
                  Genealogy
                </div>
                <div className="text-xs text-muted">
                  Read-only • FamilySearch beta
                </div>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <a
                  className="underline decoration-dotted underline-offset-4"
                  href="/"
                >
                  Busca
                </a>
                <a
                  className="underline decoration-dotted underline-offset-4"
                  href="/memories"
                >
                  Memories
                </a>
                <a
                  className="underline decoration-dotted underline-offset-4"
                  href="https://www.familysearch.org/"
                  target="_blank"
                  rel="noreferrer"
                >
                  FamilySearch
                </a>
                <a
                  className="underline decoration-dotted underline-offset-4"
                  href="https://github.com/junowoz/genealogy"
                  target="_blank"
                  rel="noreferrer"
                >
                  GitHub Project
                </a>
                <ThemeToggle />
              </div>
            </header>
            {children}
            <footer className="mt-10 border-t border-border pt-6 text-xs text-muted">
              Read-only. Hints e matches sempre analisados no FamilySearch via
              redirect.
            </footer>
          </Container>
        </ReactQueryClientProvider>
      </body>
    </html>
  );
}
