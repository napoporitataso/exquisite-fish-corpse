import importPlugin from 'eslint-plugin-import';
import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';

export default defineConfig(
  ...[
    {
      ignores: ['dist', 'build'],
    },
    {
      files: ['**/*.ts'],
      extends: [...tseslint.configs.recommended, ...tseslint.configs.stylistic, importPlugin.flatConfigs.typescript],
      languageOptions: {
        parser: tseslint.parser,
        parserOptions: {
          ecmaVersion: 2022,
          sourceType: 'module',
          project: './tsconfig.json',
          tsconfigRootDir: import.meta.dirname,
        },
      },
      rules: {
        '@typescript-eslint/explicit-function-return-type': 'off',
        '@typescript-eslint/no-var-requires': 'off',
        '@typescript-eslint/no-unused-vars': 'warn',
        '@typescript-eslint/no-explicit-any': 'warn',
        '@typescript-eslint/no-inferrable-types': 'warn',
        '@typescript-eslint/prefer-for-of': 'warn',
        '@typescript-eslint/require-await': 'warn',
        '@typescript-eslint/consistent-type-definitions': ['warn', 'type'],
        '@typescript-eslint/consistent-indexed-object-style': ['warn', 'record'],
        '@typescript-eslint/non-nullable-type-assertion-style': 'warn',
        '@typescript-eslint/consistent-type-imports': 'warn',
      },
      settings: {
        'import/resolver': {
          ...importPlugin.flatConfigs.typescript.settings['import/resolver'],
          typescript: {
            alwaysTryTypes: true,
          },
        },
      },
    },
    {
      files: ['**/*.test.ts'],
      rules: {},
    },
  ],
);
