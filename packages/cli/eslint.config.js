import { defineConfig } from 'eslint/config';

import baseConfig from '../core/eslint.config.js';

export default defineConfig(baseConfig, {
  files: ['**/*.ts'],
  languageOptions: {
    parserOptions: {
      project: './tsconfig.json',
      tsconfigRootDir: import.meta.dirname,
    },
  },
});
