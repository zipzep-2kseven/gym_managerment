import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';
import hooks from 'eslint-plugin-react-hooks';
import a11y from 'eslint-plugin-jsx-a11y';

export default tseslint.config(
  { ignores: ['**/node_modules/**', '**/dist/**', '**/drizzle/**', '**/playwright-report/**', '**/test-results/**', '**/.qa-artifacts/**', '.taste-skill/**', '.agent/**', '.agents/**', 'agentic-awesome-skills/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx,js,mjs,cjs}'],
    languageOptions: { globals: { ...globals.node } },
    rules: {
      // Legacy DTO/test boundaries use any; this task enforces bug/security/a11y rules.
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' }],
    },
  },
  {
    files: ['apps/web/**/*.{ts,tsx}'],
    languageOptions: { globals: { ...globals.browser } },
  },
  {
    // Static prototypes run in the browser; their Node check scripts also
    // contain Playwright callbacks evaluated in the page context.
    files: ['docs/design/admin-pilot/*.{js,mjs}', 'docs/design/admin-workspace/*.{js,mjs}'],
    languageOptions: { globals: { ...globals.browser } },
  },
  {
    files: ['apps/web/src/**/*.{ts,tsx}'],
    plugins: { 'react-hooks': hooks, 'jsx-a11y': a11y },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'error',
      ...a11y.configs.recommended.rules,
      // Existing forms use labels that wrap native controls.
      'jsx-a11y/label-has-associated-control': ['error', { depth: 3 }],
    },
  },
);
