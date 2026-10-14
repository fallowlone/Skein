// Replaces the retired @astrojs/tailwind integration (its latest release peers
// only astro ^3||^4||^5). Astro/Vite auto-loads this config, so @tailwind
// directives in src/styles/global.css keep compiling through postcss. Pinned to
// the same tailwindcss 3 + autoprefixer the old integration injected.
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};