import js from '@eslint/js'
import babelParser from '@babel/eslint-parser'
import globals from 'globals'
import react from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'

const reactRecommended = react.configs.flat.recommended

export default [
  {
    ignores: [
      'dist/**',
      'ios/**',
      'node_modules/**',
      'GTP/**',
      'playwright-report/**',
      'test-results/**',
      'coverage-ui/**',
    ],
  },
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
      'no-duplicate-imports': 'error',
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '@posthog/react',
              message: 'Telemetry removed from frontend runtime. Do not reintroduce directly.',
            },
            {
              name: 'posthog-js',
              message: 'Telemetry removed from frontend runtime. Do not reintroduce directly.',
            },
          ],
        },
      ],
    },
    settings: { react: { version: 'detect' } },
  },
  {
    files: [
      'src/features/auth/components/LoginPage.jsx',
      'src/features/auth/components/LoginButtons.jsx',
      'src/features/home/components/HomePage.jsx',
      'src/features/shared/components/MainLayout.jsx',
      'src/features/profile/components/ProfilePage.jsx',
      'src/features/profile/components/ProfileForm.jsx',
      'src/features/profile/components/ProfileHeader.jsx',
    ],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: "JSXAttribute[name.name='style'] > JSXExpressionContainer > ObjectExpression",
          message:
            'No uses inline style objects in core screens. Extract to named constants or primitives.',
        },
      ],
    },
  },
  {
    // ⚠️ CRÍTICO LOGIN:
    // Prohibimos reintroducir layout props que romperían el centrado compacto
    // de icono+texto (Login).
    files: ['src/ui/primitives/ButtonBase.jsx'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector:
            "VariableDeclarator[id.name='buttonContent'] > ObjectExpression > Property[key.name='width']",
          message:
            "⚠️ CRÍTICO LOGIN: `buttonContent` NO debe tener `width: '100%'` (rompe layout compacto).",
        },
        {
          selector:
            "VariableDeclarator[id.name='buttonContent'] > ObjectExpression > Property[key.name='justifyContent'][value.value!='center']",
          message: "⚠️ CRÍTICO LOGIN: buttonContent debe mantener justifyContent: 'center'.",
        },
        {
          selector:
            "VariableDeclarator[id.name='textSlot'] > ObjectExpression > Property[key.name='flex']",
          message: '⚠️ CRÍTICO LOGIN: `textSlot` NO debe tener `flex`.',
        },
      ],
    },
  },
]
