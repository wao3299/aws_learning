import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://wao3299.github.io',
  base: '/study-deck',
  trailingSlash: 'always',
  build: { format: 'directory' },
});
