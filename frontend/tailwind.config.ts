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
        // ── Surfaces: near-pure black ─────────────────────────────
        background: '#0A0A0A',
        surface: {
          DEFAULT: '#111111',
          raised:  '#191919',
          high:    '#242424',
        },
        // ── Borders: neutral whites ───────────────────────────────
        border: {
          DEFAULT: '#1E1E1E',
          subtle:  '#141414',
          focus:   '#2E2E2E',
        },
        // ── Accent: bright teal ───────────────────────────────────
        accent: {
          DEFAULT: '#00D4A0',
          hover:   '#00BF90',
          soft:    '#7FEDD4',
          muted:   'rgba(0,212,160,0.10)',
          glow:    'rgba(0,212,160,0.18)',
        },
        // ── Semantic ─────────────────────────────────────────────
        success: {
          DEFAULT: '#00C87A',
          muted:   'rgba(0,200,122,0.12)',
        },
        warning: {
          DEFAULT: '#C49040',
          muted:   'rgba(196,144,64,0.12)',
        },
        danger: {
          DEFAULT: '#B85858',
          muted:   'rgba(184,88,88,0.12)',
        },
        // ── Chart — updated to teal-first palette ─────────────────
        chart: {
          lime:     '#00D4A0',
          pink:     '#E87878',
          sage:     '#7AC0A8',
          sky:      '#6898C8',
          amber:    '#C89850',
          lavender: '#8888C0',
        },
        // ── Text ─────────────────────────────────────────────────
        text: {
          primary:   '#F0F0F0',
          secondary: '#999999',
          muted:     '#666666',
          disabled:  '#444444',
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
        card:         '0 1px 3px rgba(0,0,0,0.9), 0 0 0 1px rgba(255,255,255,0.04)',
        'card-hover': '0 8px 24px rgba(0,0,0,0.9), 0 0 0 1px rgba(255,255,255,0.07)',
        glow:         '0 0 32px rgba(0,212,160,0.14)',
        'glow-sm':    '0 0 16px rgba(0,212,160,0.10)',
        'teal-glow':  '0 0 80px rgba(0,180,130,0.16)',
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
        // Atmospheric sage-olive bloom — matches Image 1's diffuse glow
        'atmo-glow':       'radial-gradient(ellipse 70% 55% at 88% 0%, rgba(80,120,45,0.35) 0%, rgba(55,90,25,0.14) 45%, transparent 70%)',
        'atmo-glow-left':  'radial-gradient(ellipse 45% 40% at 0% 40%, rgba(55,90,25,0.12) 0%, transparent 55%)',
        'atmo-center':     'radial-gradient(ellipse 80% 60% at 50% -5%, rgba(70,105,35,0.15) 0%, transparent 60%)',
        // Teal gradient — replaces sage-cream; used for logo, CTA buttons
        'sage-cream':      'linear-gradient(135deg, #00D4A0 0%, #7FEDD4 40%, #C0F5E8 70%, #F0FAF8 100%)',
        'sage-cream-sm':   'linear-gradient(135deg, #00C090 0%, #60D9BC 60%, #B0EAD8 100%)',
        'saas-card':       'linear-gradient(135deg, rgba(60,90,140,0.15) 0%, rgba(40,65,110,0.06) 100%)',
        'physical-card':   'linear-gradient(135deg, rgba(120,90,50,0.15) 0%, rgba(90,65,35,0.06) 100%)',
        'shimmer-gradient':'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.04) 50%, transparent 100%)',
        'surface-gradient':'linear-gradient(180deg, #191919 0%, #111111 100%)',
      },
    },
  },
  plugins: [],
}

export default config
