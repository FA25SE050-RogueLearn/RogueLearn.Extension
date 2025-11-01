/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    './entrypoints/**/*.{html,tsx,ts,jsx,js}',
    './components/**/*.{html,tsx,ts,jsx,js}',
  ],
  theme: {
    extend: {
      colors: {
        // Primary Brand Pink
        primary: {
          DEFAULT: '#d23187',
          hover: '#b82771',
        },
        // RPG Gold Accents
        rpg: {
          gold: 'hsl(45, 90%, 58%)',
          'gold-light': 'hsl(45, 100%, 65%)',
          'gold-dark': 'hsl(45, 80%, 45%)',
        },
        // Dark Theme Base - using CSS variables
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        border: 'hsl(var(--border))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        // Semantic Colors
        success: 'hsl(var(--success))',
        warning: 'hsl(var(--warning))',
        error: 'hsl(var(--error))',
        info: 'hsl(var(--info))',
        // RPG-Specific
        parchment: 'hsl(40, 35%, 85%)',
        stone: 'hsl(30, 10%, 35%)',
        mystical: 'hsl(280, 80%, 65%)',
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Consolas', 'monospace'],
        rpg: ['Cinzel', 'Serif', 'Georgia', 'serif'],
      },
      letterSpacing: {
        tighter: '-0.025em',
      },
    },
  },
  plugins: [],
}
