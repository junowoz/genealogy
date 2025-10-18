import "./globals.css";
import { ReactQueryClientProvider } from "../src/ui/ReactQueryClientProvider";
import { Container } from "../src/ui/components";
import { ThemeToggle } from "../src/ui/components";
import { AuthStatus } from "./_components/AuthStatus";
import Link from "next/link";
import Image from "next/image";

export const metadata = {
  title: "Genealogy — Pesquisa Genealógica",
  description: "Painel unificado com FamilySearch.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <head>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, viewport-fit=cover"
        />
      </head>
      <body className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-blue-950">
        <ReactQueryClientProvider>
          <Container>
            <header className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <Link href="/" className="hover:opacity-80">
                <div className="flex items-center gap-3">
                  <Image
                    src="/images/widget-genealogy-icon.png"
                    alt="Genealogy logo"
                    className="h-10 sm:h-12 w-auto select-none"
                    style={{ display: "block" }}
                    loading="eager"
                    width={1080}
                    height={1080}
                  />
                  <div>
                    <div className="text-lg sm:text-xl font-semibold tracking-tight">
                      Genealogy
                    </div>
                    <div className="text-xs text-muted">FamilySearch beta</div>
                  </div>
                </div>
              </Link>
              <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-sm w-full sm:w-auto justify-between sm:justify-end">
                <div className="flex items-center gap-3 sm:gap-4">
                  <Link
                    className="underline decoration-dotted underline-offset-4 whitespace-nowrap"
                    href="/"
                  >
                    Busca
                  </Link>
                  <Link
                    className="underline decoration-dotted underline-offset-4 whitespace-nowrap"
                    href="/memories"
                  >
                    Memories
                  </Link>
                </div>
                <div className="flex items-center gap-2 sm:gap-4">
                  <AuthStatus />
                  <ThemeToggle />
                </div>
              </div>
            </header>
            {children}
            <footer className="mt-10 border-t border-border pt-6 text-xs text-muted flex flex-wrap gap-2 items-center">
              <span>
                Hints e matches sempre analisados no FamilySearch via redirect.
              </span>
              <span className="hidden sm:inline">•</span>
              <a
                className="underline decoration-dotted underline-offset-4"
                href="https://www.familysearch.org/"
                target="_blank"
                rel="noreferrer"
              >
                FamilySearch
              </a>
              <span className="hidden sm:inline">•</span>
              <a
                className="underline decoration-dotted underline-offset-4"
                href="https://github.com/junowoz/genealogy"
                target="_blank"
                rel="noreferrer"
              >
                GitHub
              </a>
            </footer>
          </Container>
        </ReactQueryClientProvider>
      </body>
    </html>
  );
}
