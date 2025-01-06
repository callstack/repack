/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      color: {
        custom: 'var(--my-custom-color)',
        primary: 'rgb(var(--color-values) / <alpha-value>)',
      },
    },
  },
  plugins: [
    // Set a default value on the `:root` element
    ({ addBase }) =>
      addBase({
        ':root': {
          '--color-values': '255 0 0',
          '--color-rgb': 'rgb(255 0 0)',
        },
      }),
  ],
  darkMode: 'class',
};
