/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
        },
        // 主题色彩变量 - 将通过CSS动态设置
        'primary-50': 'var(--color-primary-50, #f0f9ff)',
        'primary-100': 'var(--color-primary-100, #e0f2fe)',
        'primary-200': 'var(--color-primary-200, #bae6fd)',
        'primary-300': 'var(--color-primary-300, #7dd3fc)',
        'primary-400': 'var(--color-primary-400, #38bdf8)',
        'primary-500': 'var(--color-primary-500, #0ea5e9)',
        'primary-600': 'var(--color-primary-600, #0284c7)',
        'primary-700': 'var(--color-primary-700, #0369a1)',
        'primary-800': 'var(--color-primary-800, #075985)',
        'primary-900': 'var(--color-primary-900, #0c4a6e)',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'bounce-in': 'bounceIn 0.4s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        bounceIn: {
          '0%': { transform: 'scale(0.9)', opacity: '0' },
          '50%': { transform: 'scale(1.03)', opacity: '0.9' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}
