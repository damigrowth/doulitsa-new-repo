module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    project: './tsconfig.json',
  },
  env: {
    es6: true,
    browser: true,
    node: true,
  },
  plugins: [
    'simple-import-sort',
    'import',
    'react',
    'react-hooks',
    'boundaries',
  ],
  ignorePatterns: [
    'src/**',
    '!src/app/**',
    '!src/components/**',
    '!src/actions/**',
  ],
  extends: [
    'eslint:recommended',
    'plugin:import/errors',
    'plugin:import/warnings',
    'plugin:import/recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    'plugin:boundaries/recommended',
    'plugin:prettier/recommended',
    'next',
    'next/core-web-vitals',
  ],
  rules: {
    'no-unused-vars': 'off',
    'no-irregular-whitespace': 'off',
    'simple-import-sort/imports': [
      'warn',
      {
        groups: [
          ['^\\u0000'],
          ['^node:'],
          ['^react', '^next', '^@?\\w'],
          ['^@/'],
          ['^\\.'],
          ['^.+\\.s?css$'],
        ],
      },
    ],
    'simple-import-sort/exports': 'warn',
    'import/newline-after-import': ['error', { count: 1 }],
    'no-duplicate-imports': 'error',
    'prettier/prettier': [
      'warn',
      {
        arrowParens: 'always',
        bracketSpacing: true,
        htmlWhitespaceSensitivity: 'css',
        insertPragma: false,
        jsxBracketSameLine: false,
        jsxSingleQuote: true,
        printWidth: 80,
        proseWrap: 'always',
        quoteProps: 'as-needed',
        requirePragma: false,
        semi: true,
        singleQuote: true,
        tabWidth: 2,
        trailingComma: 'all',
        useTabs: false,
        endOfLine: 'lf',
      },
    ],
    'padding-line-between-statements': [
      'error',
      { blankLine: 'always', prev: 'import', next: '*' },
      { blankLine: 'any', prev: 'import', next: 'import' },
      { blankLine: 'any', prev: 'export', next: 'export' }, // Allow no blank line between exports
      { blankLine: 'always', prev: '*', next: 'export' },
      { blankLine: 'always', prev: '*', next: 'function' },
      { blankLine: 'always', prev: '*', next: 'return' },
      { blankLine: 'always', prev: '*', next: ['const', 'let', 'var'] },
      { blankLine: 'always', prev: ['const', 'let', 'var'], next: '*' },
    ],

    // Optional: React-specific
    'react/react-in-jsx-scope': 'off', // Next.js doesn't need React import
    'react/jsx-uses-react': 'off',
    'react/no-unescaped-entities': 'off',
    'react-hooks/exhaustive-deps': 'off', // Disable exhaustive-deps rule

    // Boundaries enforcement (optional strict mode)
    'boundaries/element-types': [
      'error',
      {
        default: 'disallow',
        rules: [
          {
            from: ['components/**'],
            allow: ['utils/**', 'hooks/**'],
          },
          {
            from: ['app/**'],
            allow: ['components/**', 'hooks/**', 'utils/**', 'stores/**'],
          },
        ],
      },
    ],
  },
  overrides: [
    {
      files: ['src/app/layout.js'],
      rules: {
        'no-unused-vars': 'off',
      },
    },
    {
      files: ['src/components/**/index.js', 'src/actions/**/index.js'],
      rules: {
        'padding-line-between-statements': 'off',
      },
    },
    {
      files: ['src/lib/graphql/**/*.{js,jsx,ts,tsx}'],
      rules: {
        'padding-line-between-statements': 'off',
      },
    },
    {
      files: ['src/stores/dashboard/profile.js'],
      rules: {
        'no-unreachable': 'off',
      },
    },
  ],
  settings: {
    react: {
      version: 'detect',
    },
    'import/resolver': {
      alias: {
        map: [['@', './src']],
        extensions: ['.js', '.jsx', '.ts', '.tsx'],
      },
    },
    boundaries: {
      defaultIgnore: ['**/*.test.*', '**/*.spec.*'],
      // Match your structure: actions, components, constants, etc.
      // Each folder under `src/` can be considered a "boundary"
      // and you can customize rules for communication between them.
      // Optional: rename types to reflect project domain if needed
      // e.g., components, pages, utils, etc.
      elements: [
        { type: 'actions', pattern: 'src/actions/**/*.{js,jsx,ts,tsx}' },
        { type: 'app', pattern: 'src/app/**/*.{js,jsx,ts,tsx}' },
        { type: 'components', pattern: 'src/components/**/*.{js,jsx,ts,tsx}' },
        { type: 'constants', pattern: 'src/constants/**/*.{js,jsx,ts,tsx}' },
        { type: 'hooks', pattern: 'src/hooks/**/*.{js,jsx,ts,tsx}' },
        { type: 'lib', pattern: 'src/lib/**/*.{js,jsx,ts,tsx}' },
        { type: 'stores', pattern: 'src/stores/**/*.{js,jsx,ts,tsx}' },
        { type: 'utils', pattern: 'src/utils/**/*.{js,jsx,ts,tsx}' },
      ],
    },
  },
};
