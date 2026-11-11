import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
    { ignores: ['dist/', 'node_modules/', 'test-results/', 'playwright-report/', 'coverage/'] },
    js.configs.recommended,
    {
        files: ['src/**/*.ts'],
        extends: [...tseslint.configs.strictTypeChecked],
        languageOptions: { parserOptions: { project: './tsconfig.json' }, globals: { ...globals.browser } },
    },
    {
        files: ['tests/**/*.js', 'tests/**/*.mjs', '*.js', '*.mjs'],
        languageOptions: { ecmaVersion: 2022, sourceType: 'module', globals: { ...globals.node, ...globals.browser } },
    },
);
