import type { Config } from 'tailwindcss'

export default {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          950: '#0b1c2c',
          900: '#10233a',
          800: '#16304c',
          700: '#1f3f5f',
          100: '#e8edf3',
        },
        paper: '#faf7ef',
        card: '#ffffff',
        edge: '#e6e1d3',
        live: '#047857',
        liveSoft: '#e7f6ee',
        amber: {
          brand: '#f2a007',
          deep: '#b45309',
        },
      },
      fontFamily: {
        sans: ['ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(16,35,58,0.08), 0 4px 14px rgba(16,35,58,0.06)',
      },
    },
  },
  plugins: [],
} satisfies Config
