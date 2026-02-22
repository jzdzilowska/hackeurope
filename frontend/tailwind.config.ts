import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // ── Surfaces: CSS variable driven ───────────────────────
        background: 'rgb(var(--color-background) / <alpha-value>)',
        surface: {
          DEFAULT: 'rgb(var(--color-surface) / <alpha-value>)',
          raised:  'rgb(var(--color-surface-raised) / <alpha-value>)',
          high:    'rgb(var(--color-surface-high) / <alpha-value>)',
        },
        // ── Borders ─────────────────────────────────────────────
        border: {
          DEFAULT: 'rgb(var(--color-border) / <alpha-value>)',
          subtle:  'rgb(var(--color-border-subtle) / <alpha-value>)',
          focus:   'rgb(var(--color-border-focus) / <alpha-value>)',
        },
        // ── Text ────────────────────────────────────────────────
        text: {
          primary:   'rgb(var(--color-text-primary) / <alpha-value>)',
          secondary: 'rgb(var(--color-text-secondary) / <alpha-value>)',
          muted:     'rgb(var(--color-text-muted) / <alpha-value>)',
          disabled:  'rgb(var(--color-text-disabled) / <alpha-value>)',
        },
        // ── Semantic ────────────────────────────────────────────
        success: {
          DEFAULT: 'rgb(var(--color-success) / <alpha-value>)',
          muted:   'rgb(var(--color-success) / 0.10)',
        },
        warning: {
          DEFAULT: 'rgb(var(--color-warning) / <alpha-value>)',
          muted:   'rgb(var(--color-warning) / 0.10)',
        },
        danger: {
          DEFAULT: 'rgb(var(--color-danger) / <alpha-value>)',
          muted:   'rgb(var(--color-danger) / 0.10)',
        },
        // ── Accent: warm dark charcoal ───────────────────────────
        accent: {
          DEFAULT: '#2C2926',
          hover:   '#1A1815',
          soft:    '#7A7570',
          muted:   'rgba(44,41,38,0.07)',
          glow:    'rgba(44,41,38,0.05)',
        },
        // ── Chart palette — neon / electric (light mode) ──────────
        chart: {
          sage:     '#00D87A',   // neon teal-green — inflow / revenue / positive
          pink:     '#FF4F4F',   // electric coral  — outflow / costs / negative
          sky:      '#4A88FF',   // electric blue   — balance / trend line
          lavender: '#9B6AFF',   // electric violet — overhead
          amber:    '#FFB300',   // neon amber      — restock / secondary
          lime:     '#4A4642',   // warm gray       — misc
        },
      },

      fontFamily: {
        sans: ['DM Sans', 'system-ui', 'sans-serif'],
        mono: ['DM Mono', 'Menlo', 'monospace'],
      },

      fontSize: {
        '2xs': ['10px', { lineHeight: '14px', letterSpacing: '0.07em' }],
      },

      borderRadius: {
        card:  '18px',
        pill:  '999px',
        sm:    '6px',
        md:    '10px',
        lg:    '14px',
        xl:    '18px',
        '2xl': '24px',
      },

      boxShadow: {
        card:         'var(--card-shadow)',
        'card-hover': 'var(--card-shadow-hover)',
        glow:         '0 0 24px rgba(0,0,0,0.08)',
        'glow-sm':    '0 0 12px rgba(0,0,0,0.06)',
        'teal-glow':  '0 0 60px rgba(0,0,0,0.06)',
      },

      animation: {
        shimmer:      'shimmer 2s infinite',
        grain:        'grain 8s steps(10) infinite',
        'pulse-slow': 'pulse 4s cubic-bezier(0.4,0,0.6,1) infinite',
      },

      keyframes: {
        shimmer: {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        grain: {
          '0%, 100%': { transform: 'translate(0,0)' },
          '10%': { transform: 'translate(-2%,-3%)' },
          '20%': { transform: 'translate(3%,2%)' },
          '30%': { transform: 'translate(-1%,4%)' },
          '40%': { transform: 'translate(4%,-2%)' },
          '50%': { transform: 'translate(-3%,3%)' },
          '60%': { transform: 'translate(2%,-4%)' },
          '70%': { transform: 'translate(-4%,1%)' },
          '80%': { transform: 'translate(1%,3%)' },
          '90%': { transform: 'translate(3%,-1%)' },
        },
      },

      backgroundImage: {
        // Charcoal gradient — used for logo, CTA buttons
        'sage-cream':    'linear-gradient(135deg, #2C2926 0%, #4A4642 40%, #787470 70%, #B8B4B0 100%)',
        'sage-cream-sm': 'linear-gradient(135deg, #1A1815 0%, #3A3632 60%, #6A6662 100%)',
        'saas-card':       'linear-gradient(135deg, rgba(60,90,140,0.15) 0%, rgba(40,65,110,0.06) 100%)',
        'physical-card':   'linear-gradient(135deg, rgba(120,90,50,0.15) 0%, rgba(90,65,35,0.06) 100%)',
        'shimmer-gradient':'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.04) 50%, transparent 100%)',
      },
    },
  },
  plugins: [],
}

export default config
