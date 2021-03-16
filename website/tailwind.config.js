module.exports = {
  purge: ['./pages/**/*.{js,ts,jsx,tsx}', './components/**/*.{js,ts,jsx,tsx}'],
  darkMode: false, // or 'media' or 'class'
  theme: {
    fontFamily: {
      sans: "'Open Sans', sans-serif",
      mono: "'Fira Code', monospace",
    },
    extend: {
      colors: {
        auxiliary: {
          100: '#C7C7D9',
          200: '#B0B0BF',
          300: '#9A9AAC',
          400: '#84849A',
          500: '#65657B',
          800: '#373743',
          900: '#25252D',
        },
        'auxiliary-dark': {
          100: '#18181a',
        },
        primary: {
          100: '#989EC3',
          200: '#7D84B2',
          300: '#656DA4',
          400: '#535B8D',
        },
        class: '#70CFFF',
        interface: '#7DDE92',
        function: '#4DCCBD',
        type: '#FC814A',
        enum: '#F5DD90',
      },
    },
  },
  variants: {
    extend: {},
  },
  plugins: [],
};
