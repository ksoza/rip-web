/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        bg:      '#060608',
        bg2:     '#0a0a0d',
        bg3:     '#0f0f14',
        border:  '#14141c',
        bord2:   '#1c1c28',
        rip:     '#ff2d78',
        cyan:    '#00d4ff',
        lime:    '#8aff00',
        gold:    '#ffcc00',
        purple:  '#a855f7',
        muted:   '#3a3a50',
        muted2:  '#22222e',
      },
      fontFamily: {
        display: ['var(--font-bebas)', 'sans-serif'],
        body:    ['var(--font-instrument)', 'sans-serif'],
        mono:    ['var(--font-mono)', 'monospace'],
      },
      animation: {
        'pulse-pink':  'pulsePink 2s ease-in-out infinite',
        'shimmer':     'shimmer 2s linear infinite',
        'slide-up':    'slideUp 0.3s ease',
        'fade-in':     'fadeIn 0.4s ease',
      },
      keyframes: {
        pulsePink: {
          '0%,100%': { boxShadow: '0 0 0 0 rgba(255,45,120,0.4)' },
          '50%':     { boxShadow: '0 0 0 8px rgba(255,45,120,0)' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '200%' },
          '100%': { backgroundPosition: '-200%' },
        },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(10px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to:   { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};
