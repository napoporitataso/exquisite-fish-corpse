import { defineConfig } from 'tsdown';

export default defineConfig([
  {
    entry: 'src/index.ts',
    outDir: 'dist',
    tsconfig: 'tsconfig.build.json',
    format: ['cjs', 'esm'],
  },
]);
