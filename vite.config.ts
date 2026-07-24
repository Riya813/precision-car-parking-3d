import { defineConfig } from 'vite';

// base './' so the built bundle works from any subpath (GitHub Pages friendly)
export default defineConfig({
  base: './',
  build: { target: 'es2020', assetsInlineLimit: 0 }
});
