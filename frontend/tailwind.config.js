/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Outfit', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      colors: {
        canvas: '#050505',
        surface: '#0A0A0A',
        elevated: '#111111',
        'border-subtle': '#1F1F1F',
        'border-strong': '#2E2E2E',
        'text-primary': '#F5F5F5',
        'text-secondary': '#A3A3A3',
        'text-muted': '#666666',
        'accent-primary': '#22C55E',
        'accent-bright': '#4ADE80',
        'accent-dim': '#052E16',
        'status-danger': '#EF4444',
        'status-warning': '#EAB308',
      },
    },
  },
  plugins: [],
};
