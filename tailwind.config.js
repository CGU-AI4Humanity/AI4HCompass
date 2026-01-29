/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./client/index.html",
    "./client/src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'cgu-red': '#8B1538',
        'cgu-maroon': '#5C1128',
        'cgu-green': '#8FA643',
        'cgu-olive': '#6B8E3D',
        'cgu-dark': '#1a1a1a',
        'cgu-light': '#f5f5f0',
        'bauhaus-yellow': '#F5C516',
        'bauhaus-blue': '#0E4D92',
        'traffic-green': '#22C55E',
        'traffic-yellow': '#EAB308',
        'traffic-red': '#EF4444',
      },
      fontFamily: {
        'bauhaus': ['Inter', 'Helvetica Neue', 'Arial', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
