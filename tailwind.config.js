export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: { sans: ['Poppins', 'ui-sans-serif', 'system-ui'] },
      colors: {
        navy: '#053867',
        royal: '#253985',
        gold: '#F7BA23',
        lightgold: '#F3CE49'
      },
      boxShadow: {
        soft: '0 10px 25px rgba(5,56,103,0.08)'
      },
      borderRadius: {
        '2xl': '1rem'
      }
    }
  },
  plugins: []
};
