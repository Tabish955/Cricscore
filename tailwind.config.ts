import type { Config } from 'tailwindcss'

export default {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        pine: {
          950: '#0c261b',
          900: '#123324',
          800: '#173f2d',
          700: '#20503b',
          600: '#2b6048',
          100: '#e7ece1',
          50: '#eef1e8',
        },
        paper: '#f5f0e4',
        card: '#fffdf6',
        edge: '#e3dcc9',
        ink: '#1e2a23',
        brass: {
          DEFAULT: '#a87b24',
          deep: '#7a5410',
          light: '#e2b659',
        },
        live: '#1e6b46',
        liveSoft: '#e9efe3',
      },
      fontFamily: {
        display: ['"Fraunces Variable"', 'Georgia', '"Times New Roman"', 'serif'],
        sans: ['"Archivo Variable"', 'ui-sans-serif', 'system-ui', '-apple-system', '"Segoe UI"', 'Roboto', 'sans-serif'],
      },
      fontSize: {
        verdict: ['0.95rem', { lineHeight: '1.35' }],
      },
      boxShadow: {
        card: '0 1px 2px rgba(12,38,27,0.10), 0 6px 18px rgba(12,38,27,0.08)',
        lift: '0 2px 4px rgba(12,38,27,0.12), 0 12px 32px rgba(12,38,27,0.14)',
      },
    },
  },
  plugins: [],
} satisfies Config
