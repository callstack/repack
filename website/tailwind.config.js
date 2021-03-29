/* eslint-disable import/no-extraneous-dependencies */
const colors = require('tailwindcss/colors');
const Color = require('color');

function transformColors(baseColors, transformer) {
  return Object.entries(baseColors).reduce(
    (acc, [key, value]) => ({
      ...acc,
      [key]: transformer(value),
    }),
    {}
  );
}

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
      emerald: transformColors(colors.emerald, (value) =>
        Color(value).desaturate(0.2).blacken(0.25).hex()
      ),
      blue: transformColors(colors.blue, (value) =>
        Color(value).desaturate(0.2).blacken(0.25).hex()
      ),
      orange: transformColors(colors.orange, (value) =>
        Color(value).desaturate(0.2).blacken(0.25).hex()
      ),
      violet: transformColors(colors.violet, (value) =>
        Color(value).desaturate(0.2).blacken(0.25).hex()
      ),
      teal: transformColors(colors.teal, (value) =>
        Color(value).desaturate(0.2).blacken(0.25).hex()
      ),
    },
  },
  variants: {
    extend: {},
  },
  plugins: [],
};
