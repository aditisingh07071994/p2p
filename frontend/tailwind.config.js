/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./admin.html",
    "./src/admin.jsx", 
  ],
  theme: {
    extend: {
      animation: {
        'pulse-glow': 'pulse-glow 2s infinite',
        'float': 'float 6s ease-in-out infinite',
        'slideIn': 'slideIn 0.3s ease-out',
      },
      keyframes: ({ theme }) => ({
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 5px rgba(34, 197, 94, 0.4)' },
          '50%': { boxShadow: '0 0 20px rgba(34, 197, 94, 0.8)' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        'slideIn': {
          'from': { opacity: '0', transform: 'translateY(20px)' },
          'to': { opacity: '1', transform: 'translateY(0)' },
        }
      }),
    },
  },
}