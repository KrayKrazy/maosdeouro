module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        gold: '#D4AF37',
        'gold-dark': '#B5952F',
      },
      fontFamily: {
        montserrat: ['var(--font-montserrat)', 'sans-serif'],
        roboto: ['var(--font-roboto)', 'sans-serif'],
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleUp: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        }
      },
      animation: {
        fadeIn: 'fadeIn 0.4s ease-out forwards',
        slideUp: 'slideUp 0.5s ease-out forwards',
        scaleUp: 'scaleUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards',
      }
    },
  },
  plugins: [],
};
