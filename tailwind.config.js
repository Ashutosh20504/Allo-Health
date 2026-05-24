/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'luxe-purple': '#6E42E5',
        'luxe-purple-dark': '#5534C4',
        'luxe-purple-light': '#8B67FF',
        'hope-yellow': '#F59E0B',
        'hope-yellow-light': '#FCD34D',
        'warm-bg': '#FFFCF6',
        'warm-card': '#FDF9F3',
        'dark-1': '#1A1A2E',
        'dark-2': '#16213E',
        'muted-text': '#6B7280',
      },
      fontFamily: {
        sans: ['Inter', 'Poppins', 'system-ui', 'sans-serif'],
        heading: ['Poppins', 'Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'pulse-slow': 'pulse 3s infinite',
        'countdown': 'countdown 1s linear infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      boxShadow: {
        'card': '0 2px 8px rgba(110, 66, 229, 0.08), 0 1px 3px rgba(0,0,0,0.06)',
        'card-hover': '0 8px 24px rgba(110, 66, 229, 0.15), 0 2px 8px rgba(0,0,0,0.08)',
        'purple': '0 4px 14px rgba(110, 66, 229, 0.35)',
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
    },
  },
  plugins: [],
}
