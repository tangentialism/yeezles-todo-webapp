/** @type {import('tailwindcss').Config} */

// Colors resolve to CSS variables (RGB channels) defined in src/index.css so a
// dark theme can later be added by redefining the variables only.
const token = (name) => `rgb(var(--${name}) / <alpha-value>)`;

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        paper: token('paper'),
        surface: token('surface'),
        ink: {
          DEFAULT: token('ink'),
          2: token('ink-2'),
          muted: token('ink-muted'),
          faint: token('ink-faint'),
        },
        line: {
          DEFAULT: token('line'),
          strong: token('line-strong'),
        },
        hover: token('hover'),
        accent: {
          DEFAULT: token('accent'),
          soft: token('accent-soft'),
          ink: token('accent-ink'),
        },
        danger: {
          DEFAULT: token('danger'),
          soft: token('danger-soft'),
        },
        ok: token('ok'),
      },
      fontFamily: {
        serif: ['Newsreader', 'Georgia', 'serif'],
        sans: ['Geist', 'system-ui', 'sans-serif'],
        mono: ['"Geist Mono"', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        menu: '0 18px 44px -14px rgb(20 26 33 / 0.25), 0 2px 6px rgb(20 26 33 / 0.05)',
        dialog: '0 30px 80px -24px rgb(20 26 33 / 0.45), 0 0 0 1px rgb(20 26 33 / 0.06)',
      },
    },
  },
  plugins: [],
}
