import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // shadcn-style tokens, all driven by CSS vars in globals.css
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        // Brand color is per-organization. Drives accents only.
        // Hex value lives on `--brand` (set at runtime by OrgThemeProvider).
        // We expose Tailwind utilities via the same custom property.
        brand: {
          DEFAULT: "rgb(var(--brand-rgb) / <alpha-value>)",
          foreground: "rgb(var(--brand-foreground-rgb) / <alpha-value>)",
        },
        // Status pill palette (independent of brand). Desaturated so they
        // read as accents, not floods.
        status: {
          info: "hsl(210 35% 62%)",
          warning: "hsl(38 50% 60%)",
          danger: "hsl(0 45% 62%)",
          neutral: "hsl(0 0% 50%)",
          positive: "hsl(150 25% 62%)",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
