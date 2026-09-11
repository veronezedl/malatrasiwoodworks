/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: "#1f1710",
        accent: "#b28d3e",
        bg: "#fbf9f5",
        "bg-muted": "#f1ece2",
        text: "#1f1710",
        "text-muted": "#6b5f4f",
        success: "#1e8e5a",
      },
      borderRadius: {
        brand: "12px",
      },
      fontFamily: {
        heading: ["Poppins", "sans-serif"],
        body: ["Inter", "sans-serif"],
      },
    },
  },
  plugins: [],
};
