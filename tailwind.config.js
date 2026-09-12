/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: "#15110d",
        accent: "#c1975a",
        bg: "#fbf9f5",
        "bg-muted": "#f1ece2",
        text: "#1f1710",
        "text-muted": "#6b5f4f",
        success: "#1e8e5a",
      },
      borderRadius: {
        brand: "0px",
      },
      fontFamily: {
        heading: ["Playfair Display", "serif"],
        body: ["Inter", "sans-serif"],
      },
      letterSpacing: {
        widest2: "0.18em",
      },
    },
  },
  plugins: [],
};
