/*
Copyright (c) (2026 - infinity) Maifee Ul Asad
*/

import tseslint from 'typescript-eslint';
import type { Linter } from 'eslint';
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import jsxA11yPlugin from 'eslint-plugin-jsx-a11y';
import importPlugin from 'eslint-plugin-import';
import promisePlugin from 'eslint-plugin-promise';
import globals from 'globals';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Convenience cast for external plugins that don't ship TypeScript type declarations.
const asFlatConfig = (c: unknown): Linter.Config => c as Linter.Config;

export default tseslint.config(
  // ── global ignores ──────────────────────────────────────────────────────────
  {
    ignores: ['node_modules/**', 'build/**', 'dist/**', 'public/**', 'coverage/**', '.eslintcache'],
  },

  // ── TypeScript: recommended rules + type-checked ─────────────────────────────
  ...tseslint.configs.recommendedTypeChecked,

  // ── React recommended (flat config) ─────────────────────────────────────────
    asFlatConfig(reactPlugin.configs.flat.recommended),

  // ── React Hooks recommended ──────────────────────────────────────────────────
    asFlatConfig(reactHooksPlugin.configs.flat.recommended),

  // ── JSX Accessibility ────────────────────────────────────────────────────────
  asFlatConfig(jsxA11yPlugin.flatConfigs.recommended),

  // ── Import resolution ────────────────────────────────────────────────────────
  asFlatConfig(importPlugin.flatConfigs.recommended),
  asFlatConfig(importPlugin.flatConfigs.typescript),

  // ── Promises ─────────────────────────────────────────────────────────────────
  asFlatConfig(promisePlugin.configs['flat/recommended']),

  // ── All project TS/TSX sources ───────────────────────────────────────────────
  {
    files: ['src/**/*.{ts,tsx}', 'scripts/**/*.ts'],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.eslint.json'],
        tsconfigRootDir: __dirname,
        // Disable auto project-service discovery; use our explicit tsconfig above.
        projectService: false,
      },
      globals: {
        ...globals.browser,
        ...globals.es2022,
        ...globals.node,
      },
    },
    settings: {
      react: { version: 'detect' },
      'import/resolver': {
        typescript: { project: './tsconfig.eslint.json' },
        node: { extensions: ['.js', '.jsx', '.ts', '.tsx'] },
      },
    },
    rules: {
      // ── base ────────────────────────────────────────────────────────────────
      curly: ['error', 'all'],
      eqeqeq: ['error', 'always', { null: 'ignore' }],
      'no-alert': 'error',
      'no-console': 'off',
      'no-unused-vars': 'off',

      // ── react ────────────────────────────────────────────────────────────────
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',

      // ── react-hooks ──────────────────────────────────────────────────────────
      // Managing loading/error state synchronously inside effects is a deliberate
      // pattern throughout this codebase (fluid sim initialisation effects).
      'react-hooks/set-state-in-effect': 'off',

      // ── import ───────────────────────────────────────────────────────────────
      'import/newline-after-import': 'error',
      'import/no-named-as-default-member': 'off',
      'import/no-duplicates': 'error',
      'import/order': [
        'error',
        {
          groups: [
            ['builtin', 'external'],
            ['internal'],
            ['parent', 'sibling', 'index'],
            ['type'],
          ],
          'newlines-between': 'always',
          alphabetize: { order: 'asc', caseInsensitive: true },
        },
      ],

      // ── promise ──────────────────────────────────────────────────────────────
      'promise/always-return': 'off',

      // ── @typescript-eslint ───────────────────────────────────────────────────
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': [
        'error',
        { checksVoidReturn: { attributes: false } },
      ],
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/restrict-plus-operands': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/restrict-template-expressions': [
        'error',
        { allowNumber: true, allowBoolean: true, allowNullish: true },
      ],
    },
  },

  // ── scripts: node-only env, console allowed ──────────────────────────────────
  {
    files: ['scripts/**/*.ts'],
    languageOptions: {
      globals: globals.node,
    },
    rules: {
      'no-console': 'off',
    },
  },
);
