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
        // ── Surfaces: deep navy-black ─────────────────────────────
        background: '#08090F',
        surface: {
          DEFAULT: '#0D0F1A',
          raised:  '#131728',
          high:    '#1A1E30',
        },
        // ── Borders: navy-tinted ─────────────────────────────────
        border: {
          DEFAULT: '#1C2035',
          subtle:  '#12152A',
          focus:   '#2A3055',
        },
        // ── Accent: muted sage-lime — organic, not neon ──────────
        accent: {
          DEFAULT: '#A8C940',
          hover:   '#BAD94E',
          soft:    '#D4E890',
          muted:   'rgba(168,201,64,0.10)',
          glow:    'rgba(168,201,64,0.16)',
        },
        // ── Semantic ─────────────────────────────────────────────
        success: {
          DEFAULT: '#5EA87A',
          muted:   'rgba(94,168,122,0.12)',
        },
        warning: {
          DEFAULT: '#C49040',
          muted:   'rgba(196,144,64,0.12)',
        },
        danger: {
          DEFAULT: '#B85858',
          muted:   'rgba(184,88,88,0.12)',
        },
        // ── Chart — muted pastels, navy-tuned ────────────────────
        chart: {
          lime:     '#A8C940',
          pink:     '#B87890',
          sage:     '#68A880',
          sky:      '#6890B8',
          amber:    '#B89050',
          lavender: '#8080B0',
        },
        // ── Text ─────────────────────────────────────────────────
        text: {
          primary:   '#E8EAF2',
          secondary: '#7880A0',
          muted:     '#4A5070',
          disabled:  '#30364A',
        },
      },

      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Menlo', 'monospace'],
      },

      fontSize: {
        '2xs': ['10px', { lineHeight: '14px', letterSpacing: '0.07em' }],
      },

      borderRadius: {
        card:  '14px',
        pill:  '999px',
        sm:    '6px',
        md:    '9px',
        lg:    '12px',
        xl:    '16px',
        '2xl': '20px',
      },

      boxShadow: {
        card:         '0 1px 3px rgba(0,0,4,0.8), 0 0 0 1px rgba(255,255,255,0.04)',
        'card-hover': '0 8px 24px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.07)',
        glow:         '0 0 32px rgba(168,201,64,0.14)',
        'glow-sm':    '0 0 16px rgba(168,201,64,0.10)',
        'teal-glow':  '0 0 80px rgba(40,110,80,0.16)',
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
        'atmo-glow':       'radial-gradient(ellipse 65% 50% at 85% 0%, rgba(40,100,70,0.22) 0%, rgba(25,70,50,0.10) 40%, transparent 70%)',
        'atmo-glow-left':  'radial-gradient(ellipse 45% 40% at 0% 40%, rgba(30,80,55,0.12) 0%, transparent 55%)',
        'atmo-center':     'radial-gradient(ellipse 80% 60% at 50% -5%, rgba(35,90,65,0.16) 0%, transparent 60%)',
        'sage-cream':      'linear-gradient(135deg, #C8D870 0%, #DCE8A0 40%, #EEE8D0 70%, #F0EBE4 100%)',
        'sage-cream-sm':   'linear-gradient(135deg, #B8C860 0%, #CCE090 60%, #E0D8C0 100%)',
        'saas-card':       'linear-gradient(135deg, rgba(60,90,140,0.15) 0%, rgba(40,65,110,0.06) 100%)',
        'physical-card':   'linear-gradient(135deg, rgba(120,90,50,0.15) 0%, rgba(90,65,35,0.06) 100%)',
        'shimmer-gradient':'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.04) 50%, transparent 100%)',
        'surface-gradient':'linear-gradient(180deg, #131728 0%, #0D0F1A 100%)',
      },
    },
  },
  plugins: [],
}

export default config
