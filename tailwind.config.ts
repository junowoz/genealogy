import type { Config } from 'tailwindcss'

export default {
  darkMode: 'class',
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        bg: 'hsl(var(--bg))',
        fg: 'hsl(var(--fg))',
        muted: 'hsl(var(--muted))',
        accent: 'hsl(var(--accent))',
      },
      boxShadow: {
        card: '0 1px 2px rgba(0,0,0,0.06), 0 8px 24px rgba(0,0,0,0.08)',
      },
    },
  },
  plugins: [],
} satisfies Config
