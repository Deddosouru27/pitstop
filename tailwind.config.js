/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        surface: 'var(--color-surface)',
        'surface-el': 'var(--color-surface-el)',
        accent: '#7c3aed',
        'accent-blue': '#2563eb',
        success: '#10b981',
        warning: '#f59e0b',
        danger: '#ef4444',
      },
      animation: {
        'slide-up': 'slide-up 0.3s cubic-bezier(0.32, 0.72, 0, 1)',
        'slide-right': 'slide-right 0.25s cubic-bezier(0.32, 0.72, 0, 1)',
        'fade-in': 'fade-in 0.15s ease-out',
      },
      keyframes: {
        'slide-up': {
          '0%': { transform: 'translateY(100%)' },
          '100%': { transform: 'translateY(0)' },
        },
        'slide-right': {
          '0%': { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}
