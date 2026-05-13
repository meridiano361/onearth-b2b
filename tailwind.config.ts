import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#1C1C1C',
        background: '#FAFAF7',
        accent: '#C4A882',
        cream: '#F5EFE6',
        border: '#E8E2D9',
        gray: {
          DEFAULT: '#8A8480',
          50: '#FAFAF7',
          100: '#F5EFE6',
          200: '#E8E2D9',
          300: '#D4CEC8',
          400: '#B8B2AC',
          500: '#8A8480',
          600: '#6A6460',
          700: '#4A4440',
          800: '#2A2420',
          900: '#1C1C1C',
        },
        gold: '#C4A882',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Playfair Display', 'Georgia', 'serif'],
      },
      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '0.875rem' }],
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '320': '320px',
      },
      maxWidth: {
        '8xl': '88rem',
        '9xl': '96rem',
      },
      boxShadow: {
        'luxury': '0 1px 3px rgba(28,28,28,0.06), 0 4px 16px rgba(28,28,28,0.04)',
        'luxury-lg': '0 4px 24px rgba(28,28,28,0.08), 0 1px 4px rgba(28,28,28,0.04)',
        'luxury-xl': '0 8px 40px rgba(28,28,28,0.12), 0 2px 8px rgba(28,28,28,0.06)',
      },
      borderRadius: {
        'sm': '2px',
        DEFAULT: '4px',
        'md': '6px',
        'lg': '8px',
        'xl': '12px',
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-in-right': 'slideInRight 0.3s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideInRight: {
          '0%': { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        slideUp: {
          '0%': { transform: 'translateY(8px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
