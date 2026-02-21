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
          raised:  '#181818',
          high:    '#222222',
        },
        // ── Borders: very subtle neutral ──────────────────────────
        border: {
          DEFAULT: '#1C1C1C',
          subtle:  '#141414',
          focus:   '#2A2A2A',
        },
        // ── Accent: white — like Revolut/Mercury dark mode ────────
        accent: {
          DEFAULT: '#FFFFFF',
          hover:   '#F0F0F0',
          soft:    'rgba(255,255,255,0.55)',
          muted:   'rgba(255,255,255,0.06)',
          glow:    'rgba(255,255,255,0.04)',
        },
        // ── Semantic — data indicators only ──────────────────────
        success: {
          DEFAULT: '#3DBF7A',
          muted:   'rgba(61,191,122,0.12)',
        },
        warning: {
          DEFAULT: '#C49040',
          muted:   'rgba(196,144,64,0.12)',
        },
        danger: {
          DEFAULT: '#B85858',
          muted:   'rgba(184,88,88,0.12)',
        },
        // ── Chart — data-viz only, desaturated ───────────────────
        chart: {
          blue:     '#5B9BD5',   // primary positive / cash line
          pink:     '#C07070',   // burn / expense
          sage:     '#6BAA94',   // secondary positive
          sky:      '#6898C8',
          amber:    '#C89850',
          lavender: '#8888C0',
        },
        // ── Text ─────────────────────────────────────────────────
        text: {
          primary:   '#F0F0F0',
          secondary: '#999999',
          muted:     '#666666',
          disabled:  '#404040',
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
        card:  '12px',
        pill:  '999px',
        sm:    '6px',
        md:    '8px',
        lg:    '10px',
        xl:    '14px',
        '2xl': '18px',
      },

      boxShadow: {
        card:         '0 1px 3px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.04)',
        'card-hover': '0 4px 16px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.07)',
        // No glow effects — clean banking aesthetic
        glow:         'none',
        'glow-sm':    'none',
        'teal-glow':  'none',
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
        // No atmospheric glow — clean flat surfaces
        'atmo-glow':        'none',
        'atmo-glow-left':   'none',
        'atmo-center':      'none',
        // Neutral white gradient for logo mark only
        'brand-mark':       'linear-gradient(135deg, #FFFFFF 0%, #999999 100%)',
        'shimmer-gradient': 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.03) 50%, transparent 100%)',
        'surface-gradient': 'linear-gradient(180deg, #181818 0%, #111111 100%)',
      },
    },
  },
  plugins: [],
}

export default config
