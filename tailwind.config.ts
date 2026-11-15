import type { Config } from 'tailwindcss';

// Red Velvet & Black Forest theme.
//   cake   = red velvet crimson (primary)
//   forest = black forest chocolate (ink / dark surfaces)
//   cream  = cream-cheese frosting (page + soft surfaces)
// The stock gray/green/amber/red/blue scales are re-mapped so existing utility
// classes (text-gray-500, bg-amber-100, ...) pick up the theme automatically.
const velvet = {
  50:  '#FEF3F4',
  100: '#FCE1E4',
  200: '#F8C2C9',
  300: '#F093A0',
  400: '#E3596F',
  500: '#C92A47',
  600: '#A31232',
  700: '#84102B',
  800: '#680E25',
  900: '#4A0A1B',
};

const forest = {
  50:  '#F6F1F0',
  100: '#E8DEDC',
  200: '#CDBAB7',
  300: '#A68F8B',
  400: '#7C625E',
  500: '#5A423F',
  600: '#3F2A29',
  700: '#2E1D1D',
  800: '#211415',
  900: '#170D0E',
  950: '#0F0708',
};

const amber = {
  50:  '#FFF8EA',
  100: '#FDEBC6',
  200: '#FADB96',
  300: '#F2C25E',
  400: '#E6A532',
  500: '#CC8A16',
  600: '#A86E10',
  700: '#85540F',
  800: '#6A4412',
  900: '#563913',
};

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        cake: velvet,
        forest,
        cream: {
          50:  '#FFF9F4',
          100: '#FBF0E7',
          200: '#F3E0D1',
          300: '#E7CBB6',
        },
        // Warm "mocha" neutrals instead of cool grays.
        gray: {
          50:  '#FAF6F4',
          100: '#F3ECE9',
          200: '#E6DBD7',
          300: '#D2C3BE',
          400: '#8A7771',
          500: '#6F5E59',
          600: '#5F4F4B',
          700: '#473A37',
          800: '#302625',
          900: '#1F1817',
        },
        // Success = forest/pistachio green.
        green: {
          50:  '#F0F7F2',
          100: '#DCEDE2',
          200: '#B9DBC6',
          300: '#8CC3A1',
          400: '#5BA37C',
          500: '#3A8560',
          600: '#2C6B4C',
          700: '#245640',
          800: '#1E4533',
          900: '#183828',
        },
        // Warning = caramel gold.
        amber,
        yellow: amber,
        // Danger = cherry scarlet (distinct from the crimson primary).
        red: {
          50:  '#FFF1EF',
          100: '#FFDFDB',
          200: '#FFC2BB',
          300: '#FF9488',
          400: '#F4604F',
          500: '#DE3B2C',
          600: '#BE2A1E',
          700: '#99231A',
          800: '#7D2019',
          900: '#671F19',
        },
        // Info = berry plum.
        blue: {
          50:  '#F8F2F8',
          100: '#EFE0EF',
          200: '#E0C2E0',
          300: '#CB98CA',
          400: '#B06BAF',
          500: '#8F4690',
          600: '#75367A',
          700: '#5E2C61',
          800: '#4C2650',
          900: '#3E2141',
        },
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['var(--font-display)', 'Georgia', 'serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(74, 10, 27, 0.06), 0 6px 20px -8px rgba(74, 10, 27, 0.18)',
        lift: '0 2px 4px rgba(74, 10, 27, 0.10), 0 14px 32px -12px rgba(74, 10, 27, 0.35)',
      },
    },
  },
  plugins: [],
};

export default config;
