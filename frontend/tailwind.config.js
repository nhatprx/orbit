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
        canvas: '#0D1117',
        surface: '#161B22',
        elevated: '#21262D',
        'border-subtle': '#30363D',
        'border-strong': '#3B434B',
        'text-primary': '#E6EDF3',
        'text-secondary': '#BDBDBD',
        'text-muted': '#8A8A8A',
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
