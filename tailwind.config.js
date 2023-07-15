/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./public/**/*.{html,js,css}",
    "./src/**/*.{html,js,css}",
    "./node_modules/flowbite/**/*.js",
  ],
  darkMode: "class",
  plugins: [require("flowbite/plugin")],
};
