import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    'core/index': 'src/core/index.ts',
    'nest/index': 'src/nest/index.ts',
    'react/index': 'src/react/index.ts',
  },
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  clean: true,
  treeshake: true,
  target: 'es2022',
  // Framework deps stay external — they are peers, never bundled.
  // /core is also external for the /nest entry: it imports the sibling subpath
  // at runtime (resolved via the package exports map) rather than re-bundling it.
  external: [
    '@nestjs/common',
    '@nestjs/core',
    'reflect-metadata',
    'rxjs',
    'bullmq',
    'react',
    'react/jsx-runtime',
    'react-dom',
    '@tanstack/react-query',
    '@idevconn/isubscribe-widget-react',
    '@idevconn/monetization/core',
  ],
});
