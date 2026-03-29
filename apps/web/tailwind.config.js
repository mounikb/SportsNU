/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#0A0F1A',
        card: '#141425',
        'card-border': '#1E2235',
        text: '#E8E8E8',
        'text-muted': '#8892A4',
        accent: '#00F5A0',
        live: '#FF3B3B',
      },
      fontFamily: {
        sans: ['"Instrument Sans"', 'sans-serif'],
      },
      borderRadius: {
        card: '14px',
      },
    },
  },
  plugins: [],
};
