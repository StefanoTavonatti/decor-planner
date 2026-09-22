import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist', 'dev-dist', 'node_modules', 'playwright-report', 'test-results'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: { ecmaVersion: 2022, globals: { ...globals.browser, ...globals.worker } },
    plugins: { 'react-hooks': reactHooks, 'react-refresh': reactRefresh },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },
  {
    // Shared UI helpers export both components and imperative helpers (dialogs, hooks).
    files: ['src/features/common/**/*.tsx'],
    rules: { 'react-refresh/only-export-components': 'off' },
  },
  {
    // core/ is pure domain logic: no React, no UI, no storage.
    files: ['src/core/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            { group: ['react', 'react-*', 'konva', 'dexie'], message: 'core/ must stay framework-free.' },
            { group: ['../features/*', '../storage/*', '../app/*', '../workers/*'], message: 'core/ must not depend on outer layers.' },
          ],
        },
      ],
    },
  },
);
