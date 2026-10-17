// Replaces the retired @astrojs/tailwind integration (its latest release peers
// only astro ^3||^4||^5). Astro/Vite auto-loads this config, so the Tailwind
// import in src/styles/global.css keeps compiling through postcss.
// Tailwind v4 compiles through its Vite plugin (see astro.config.mjs), not
// here — this config only keeps autoprefixer for the hand-written kit CSS.
export default {
  plugins: {
    autoprefixer: {},
  },
};