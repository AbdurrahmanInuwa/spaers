/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx}',
    './components/**/*.{js,jsx}',
  ],
  theme: {
    extend: {
      // ── SPAERS palette ──────────────────────────────────────────
      // navy   = trust / authority    (headers, footers, dark UI)
      // ice    = clean off-white      (page backgrounds)
      // red    = action / emergency   (CTAs, SOS, alert badges)
      // teal   = safe / resolved      (success states, confirmations)
      // slate  = body copy + muted
      colors: {
        navy: {
          DEFAULT: '#0B1E36',
          50:  '#EEF2F8',
          100: '#D7DEEC',
          200: '#A8B5CF',
          300: '#7A8CB3',
          400: '#4E6492',
          500: '#243F70',
          600: '#15305A',
          700: '#0B1E36',
          800: '#08182A',
          900: '#04101C',
        },
        ice:   '#F4F7FC',
        red:   { DEFAULT: '#E63946', dark: '#C1121F', light: '#FBE3E6' },
        teal:  { DEFAULT: '#2A9D8F', dark: '#1F7A6F' },
        ink:   '#1A1A1A',
        muted: '#5B6C7E',
        // Keep the legacy `brand` alias so existing app screens still
        // render with the new emergency red without a sweeping refactor.
        brand: { DEFAULT: '#E63946', dark: '#C1121F' },
      },

      // ── Fonts wired from next/font CSS variables in app/layout.js ──
      fontFamily: {
        sans: ['var(--font-roboto)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['var(--font-roboto-mono)', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },

      // ── Modular scale (1.25), see design spec § 4 ─────────────
      fontSize: {
        'micro':   ['0.75rem',  { lineHeight: '1.4', letterSpacing: '0.1em' }],
        'nav':     ['1rem',     { lineHeight: '1.4', letterSpacing: '0.05em' }],
        'body':    ['1.125rem', { lineHeight: '1.7' }],
        'h3':      ['1.5rem',   { lineHeight: '1.3' }],
        'h2':      ['clamp(2rem, 3vw, 2.75rem)',     { lineHeight: '1.2' }],
        'h1':      ['clamp(2.5rem, 5vw, 4.5rem)',    { lineHeight: '1.05' }],
        'countdown': ['clamp(3rem, 4vw, 5rem)',       { lineHeight: '1' }],
      },

      // ── 8-px grid spacing & container widths ──
      maxWidth: {
        container: '1280px',
      },
      spacing: {
        'section':       '5rem',   // 80px — desktop section padding
        'section-mobile':'3rem',   // 48px — mobile
      },

      // ── Border radii ──
      borderRadius: {
        btn:   '6px',
        card:  '12px',
        modal: '16px',
      },

      // ── Spec-driven shadow tiers ──
      boxShadow: {
        'spaers-sm': '0 4px 6px -2px rgba(11, 30, 54, 0.08)',
        'spaers-md': '0 10px 25px -5px rgba(11, 30, 54, 0.15)',
        'spaers-lg': '0 20px 60px -10px rgba(11, 30, 54, 0.25)',
      },

      // ── Pulses + status animations ──
      keyframes: {
        spinSlow: {
          '0%':   { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
        sosPulse: {
          '0%':   { boxShadow: '0 0 0 0 rgba(230,57,70,0.55)' },
          '70%':  { boxShadow: '0 0 0 24px rgba(230,57,70,0)' },
          '100%': { boxShadow: '0 0 0 0 rgba(230,57,70,0)' },
        },
        statusBlink: {
          '0%,100%': { opacity: '1' },
          '50%':     { opacity: '0.35' },
        },
        // Ring that grows out from behind the institution-location dot and
        // fades — classic "you are here" ping.
        locationPing: {
          '0%':   { transform: 'scale(1)', opacity: '0.65' },
          '100%': { transform: 'scale(5)', opacity: '0' },
        },
      },
      animation: {
        'spin-slow':     'spinSlow 18s linear infinite',
        'sos-pulse':     'sosPulse 1.8s ease-out infinite',
        'status-blink':  'statusBlink 1.4s ease-in-out infinite',
        'location-ping': 'locationPing 1.8s ease-out infinite',
      },
    },
  },
  plugins: [],
};
