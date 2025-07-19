/** @type {import('tailwindcss').Config} */
module.exports = {
  // NOTE: Update this to include the paths to all of your component files.
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,ts,jsx,tsx}", "./app.{js,jsx,ts,tsx}",],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary_a0: '#eb0202',
        primary_a10: '#f34023',
        primary_a20: '#f95e3d',
        primary_a30: '#ff7857',
        primary_a40: '#ff9072',
        primary_a50: '#ffa78d',
        surface_a0: '#121212',
        surface_a10: '#282828',
        surface_a20: '#3f3f3f',
        surface_a30: '#575757',
        surface_a40: '#717171',
        surface_a50: '#8b8b8b',
        dark: '#000000',
        light: '#ffffff',
      }

    },
  },
  plugins: [],
}