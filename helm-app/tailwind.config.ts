import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // ── Surfaces ───────────────────────────────────────────────
        background: '#0D0D0D',
        surface: {
          DEFAULT: '#141414',
          raised:  '#1A1A1A',
          high:    '#222222',
        },
        // ── Borders ────────────────────────────────────────────────
        border: {
          DEFAULT: '#242424',
          subtle:  '#1C1C1C',
          focus:   '#383838',
        },
        // ── Accent: warm lime-yellow (from reference image) ────────
        accent: {
          DEFAULT: '#C9E651',   // lime-yellow
          hover:   '#D9F060',
          soft:    '#E8F5A3',
          muted:   'rgba(201,230,81,0.10)',
          glow:    'rgba(201,230,81,0.20)',
        },
        // ── Semantic ───────────────────────────────────────────────
        success: {
          DEFAULT: '#A8D672',
          muted:   'rgba(168,214,114,0.12)',
        },
        warning: {
          DEFAULT: '#F5C842',
          muted:   'rgba(245,200,66,0.12)',
        },
        danger: {
          DEFAULT: '#F26E6E',
          muted:   'rgba(242,110,110,0.12)',
        },
        // ── Chart pastels (from reference: bars are soft pastel) ───
        chart: {
          lime:   '#C9E651',
          pink:   '#F2AABB',
          sage:   '#A8D6B8',
          sky:    '#A8CBF0',
          amber:  '#F5D78E',
        },
        // ── Text ───────────────────────────────────────────────────
        text: {
          primary:   '#F5F5F5',
          secondary: '#A0A0A0',
          muted:     '#686868',
          disabled:  '#464646',
        },
      },

      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Menlo', 'monospace'],
      },

      fontSize: {
        '2xs': ['10px', { lineHeight: '14px', letterSpacing: '0.06em' }],
      },

      borderRadius: {
        card: '16px',
        pill: '999px',
        sm:   '8px',
        md:   '10px',
        lg:   '14px',
        xl:   '18px',
        '2xl': '22px',
      },

      boxShadow: {
        card:      '0 1px 2px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)',
        'card-hover': '0 4px 16px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.07)',
        glow:      '0 0 24px rgba(201,230,81,0.18)',
        'glow-sm': '0 0 12px rgba(201,230,81,0.12)',
      },

      animation: {
        shimmer:      'shimmer 1.8s infinite',
        'float-glow': 'floatGlow 4s ease-in-out infinite',
      },

      keyframes: {
        shimmer: {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        floatGlow: {
          '0%, 100%': { opacity: '0.6', transform: 'scale(1)' },
          '50%':      { opacity: '1',   transform: 'scale(1.05)' },
        },
      },

      backgroundImage: {
        // The hero aurora gradient — core visual identity
        'aurora':          'radial-gradient(ellipse 80% 60% at 50% -10%, rgba(201,230,81,0.35) 0%, rgba(180,210,60,0.15) 30%, rgba(13,13,13,0) 70%)',
        'aurora-card':     'linear-gradient(135deg, #D9F060 0%, #F5EFA0 40%, #F0E6C8 70%, #E8DDD0 100%)',
        'aurora-subtle':   'linear-gradient(135deg, rgba(201,230,81,0.15) 0%, rgba(201,230,81,0.04) 100%)',
        'shimmer-gradient':'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.05) 50%, transparent 100%)',
        'surface-gradient':'linear-gradient(180deg, #1A1A1A 0%, #141414 100%)',
      },
    },
  },
  plugins: [],
}

export default config
