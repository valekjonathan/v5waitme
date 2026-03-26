import js from '@eslint/js'
import babelParser from '@babel/eslint-parser'
import globals from 'globals'
import react from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'

const reactRecommended = react.configs.flat.recommended

export default [
  { ignores: ['dist/**', 'node_modules/**', 'GTP/**'] },
  {
    files: ['**/*.{js,jsx}'],
    plugins: {
      ...reactRecommended.plugins,
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    languageOptions: {
      ...reactRecommended.languageOptions,
      parser: babelParser,
      parserOptions: {
        ...reactRecommended.languageOptions?.parserOptions,
        requireConfigFile: false,
        babelOptions: {
          presets: [['@babel/preset-react', { runtime: 'automatic' }]],
        },
      },
      globals: { ...globals.browser, ...globals.node },
      ecmaVersion: 'latest',
      sourceType: 'module',
    },
    rules: {
      ...js.configs.recommended.rules,
      ...reactRecommended.rules,
      'react/react-in-jsx-scope': 'off',
      'react/jsx-uses-react': 'off',
      'react/prop-types': 'off',
      'react/jsx-uses-vars': 'error',
      ...reactHooks.configs.recommended.rules,
      // Fast refresh: en CI/quality gate usamos --max-warnings 0; esta regla es solo DX local
      'react-refresh/only-export-components': 'off',
      'no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrors: 'none',
          ignoreRestSiblings: true,
        },
      ],
    },
    settings: { react: { version: 'detect' } },
  },
]
