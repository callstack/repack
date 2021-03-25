// eslint-disable-next-line import/no-extraneous-dependencies
const colors = require('tailwindcss/colors');

module.exports = {
  purge: ['./pages/**/*.{js,ts,jsx,tsx}', './components/**/*.{js,ts,jsx,tsx}'],
  darkMode: false, // or 'media' or 'class'
  theme: {
    fontFamily: {
      sans: "'Open Sans', sans-serif",
      mono: "'Fira Code', monospace",
    },
    colors: {
      transparent: 'transparent',
      current: 'currentColor',
      black: '#000000',
      white: '#ffffff',
      'cool-gray': colors.coolGray,
      gray: colors.gray,
      emerald: colors.emerald,
      blue: colors.blue,
      orange: colors.orange,
      violet: colors.violet,
      teal: colors.teal,
    },
  },
  variants: {
    extend: {},
  },
  plugins: [],
};
