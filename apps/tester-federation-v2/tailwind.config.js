/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/host/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        custom: 'var(--my-custom-color)',
        primary: 'rgb(var(--color-values) / <alpha-value>)',
        'primary-foreground': '#ffffff',
        foreground: '#0f172a',
      },
    },
  },
  plugins: [
    ({ addBase }) =>
      addBase({
        ':root': {
          '--color-values': '255 0 0',
        },
      }),
  ],
  darkMode: 'class',
};
