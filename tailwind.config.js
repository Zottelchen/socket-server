/** @type {import('tailwindcss').Config} */
module.exports = {
	content: ["./public/**/*.{html,js}", "./public/css/tailwind.css", "./views/**/*.ejs"],
	darkMode: "class",
	mode: "jit",
	theme: {
		extend: {
			colors: {
				"water-leaf": {
					50: "#f1fcf8",
					100: "#d1f6eb",
					200: "#9cebd6",
					300: "#6ddbc2",
					400: "#3ec3a8",
					500: "#25a790",
					600: "#1b8674",
					700: "#1a6b5f",
					800: "#19564e",
					900: "#194842",
					950: "#082b27",
				},
			},
			fontFamily: {
				comfortaa: ["Comfortaa", "sans-serif"],
				economica: ["Economica", "sans-serif"],
			},
		},
	},
	plugins: [require("@tailwindcss/forms"), require("@tailwindcss/typography"), require("daisyui")],
};
