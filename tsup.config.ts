import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    'core/index': 'src/core/index.ts',
  },
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  clean: true,
  treeshake: true,
  target: 'es2022',
  // /core is transport-agnostic — no framework deps to externalize yet.
  // /nest and /react entries (added later) will externalize their peer deps.
});
