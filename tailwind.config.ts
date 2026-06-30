import type { Config } from 'tailwindcss';

// Tailwind применяется ТОЛЬКО к дашборду. Виджет (Shadow DOM) использует
// собственные инлайновые стили и не зависит от Tailwind.
const config: Config = {
  content: ['./src/app/**/*.{ts,tsx}', './src/components/**/*.{ts,tsx}'],
  theme: { extend: {} },
  plugins: [],
};

export default config;
