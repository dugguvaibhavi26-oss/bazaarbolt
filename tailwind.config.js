/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  safelist: [
    'col-span-1', 'col-span-2', 'col-span-3', 'col-span-4',
    'row-span-1', 'row-span-2', 'row-span-3', 'row-span-4',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "var(--color-primary)",
          container: "var(--color-primary-container)",
        },
        on: {
          primary: "var(--color-on-primary)",
          surface: {
            DEFAULT: "var(--color-on-surface)",
            variant: "var(--color-on-surface-variant)",
          }
        },
        surface: {
          DEFAULT: "var(--color-surface)",
          container: {
            DEFAULT: "var(--color-surface-container)",
            lowest: "#ffffff",
          },
          variant: "#e5e5e5",
        },
        error: {
          DEFAULT: "var(--color-error)",
          container: "var(--color-error-container)",
        }
      },
      fontFamily: {
        headline: "var(--font-headline)",
        body: "var(--font-body)",
      }
    },
  },
  plugins: [],
};