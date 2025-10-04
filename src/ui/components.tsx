"use client";
import React from 'react';

export function Container({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto max-w-6xl p-6">{children}</div>;
}

export function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-xl border border-border bg-white/80 shadow-card backdrop-blur dark:bg-black/30 ${className}`}>{children}</div>;
}

export function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <Card className="p-4 md:p-6">
      <div className="mb-4">
        <h2>{title}</h2>
        {description ? <p className="mt-1 text-sm text-muted">{description}</p> : null}
      </div>
      {children}
    </Card>
  );
}

export function Button({ children, onClick, type = 'button', variant = 'default', className = '' }: {
  children: React.ReactNode;
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  type?: 'button' | 'submit' | 'reset';
  variant?: 'default' | 'ghost' | 'outline';
  className?: string;
}) {
  const base = 'inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50';
  const variants: Record<string, string> = {
    default: 'bg-black text-white hover:bg-gray-800 focus:ring-black dark:bg-white dark:text-black dark:hover:bg-gray-200',
    ghost: 'text-[hsl(var(--fg))] hover:bg-black/5 dark:hover:bg-white/10',
    outline: 'border border-border text-[hsl(var(--fg))] hover:bg-black/5 dark:hover:bg-white/10',
  };
  return (
    <button type={type} onClick={onClick} className={`${base} ${variants[variant]} ${className}`}>{children}</button>
  );
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`w-full rounded-md border border-border bg-white/70 px-3 py-2 dark:bg-black/30 ${props.className ?? ''}`} />;
}

export function Label({ children }: { children: React.ReactNode }) {
  return <label className="mb-1 block text-sm font-medium">{children}</label>;
}

export function Badge({ children, tone = 'default' }: { children: React.ReactNode; tone?: 'default' | 'success' | 'warning' | 'danger' }) {
  const tones: Record<string, string> = {
    default: 'border-gray-200 bg-gray-50 text-gray-700 dark:border-white/10 dark:bg-white/10 dark:text-gray-200',
    success: 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-950/40 dark:text-emerald-300',
    warning: 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/40 dark:text-amber-300',
    danger: 'border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900/40 dark:bg-rose-950/40 dark:text-rose-300',
  };
  return <span className={`chip ${tones[tone]}`}>{children}</span>;
}

export function Toolbar({ children }: { children: React.ReactNode }) {
  return <div className="flex items-center justify-between gap-4 rounded-xl border border-border bg-white/60 p-3 dark:bg-black/20">{children}</div>;
}

export function Hero() {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-sky-50 to-indigo-100 p-6 dark:from-indigo-950/30 dark:to-sky-950/20">
      <div className="relative z-10">
        <h1>Pesquisa unificada & conexões (read‑only)</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          Encontre rapidamente a pessoa certa, com ranking explicável, normalização de lugares e um clique para abrir no FamilySearch.
        </p>
      </div>
      <div className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full bg-indigo-300/30 blur-3xl dark:bg-indigo-500/20" />
    </div>
  );
}

export function ThemeToggle() {
  const [dark, setDark] = React.useState<boolean>(false);
  React.useEffect(() => {
    const saved = typeof window !== 'undefined' ? window.localStorage.getItem('ga_theme') : null;
    const isDark = saved ? saved === 'dark' : window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.documentElement.classList.toggle('dark', isDark);
    document.documentElement.classList.toggle('light', !isDark);
    setDark(isDark);
  }, []);
  const toggle = () => {
    const next = !dark;
    document.documentElement.classList.toggle('dark', next);
    document.documentElement.classList.toggle('light', !next);
    window.localStorage.setItem('ga_theme', next ? 'dark' : 'light');
    setDark(next);
  };
  return (
    <Button variant="ghost" onClick={toggle} aria-label="Alternar tema">
      {dark ? '🌙' : '☀️'}
    </Button>
  );
}

