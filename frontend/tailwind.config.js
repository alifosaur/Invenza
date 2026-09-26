/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        grayscale: {
          1: '#fcfcfc',
          2: '#f8f8f8',
          3: '#f3f3f3',
          4: '#ededed',
          8: '#8f8f8f',
          9: '#707070',
          11: '#2f2f2f',
          12: '#1a1a1a',
        },
        green: {
          9: '#30a46c'
        }
      }
    },
  },
  corePlugins: {
    preflight: false,
  }
}
