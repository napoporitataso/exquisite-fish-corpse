import { defaultExclude, defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    include: ['src/**/*.test.ts', 'tests/**/*.test.ts'],
    pool: 'vmThreads',
    coverage: {
      provider: 'v8',
      reporter: ['text'],
      exclude: [...defaultExclude, 'tests/**', 'src/**/types.ts', 'src/generated/**'],
    },
  },
});
