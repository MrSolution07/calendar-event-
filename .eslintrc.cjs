module.exports = {
  root: true,
  env: { browser: true, node: true, es2022: true },
  extends: ['eslint:recommended'],
  parserOptions: { ecmaVersion: 'latest', sourceType: 'module' },
  rules: {
    eqeqeq: 'error',
    'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    'no-console': ['warn', { allow: ['warn', 'error'] }],
    'consistent-return': 'warn',
  },
  overrides: [
    {
      files: ['client/**/*.{js,jsx}'],
      env: { browser: true, node: false },
      parserOptions: { ecmaFeatures: { jsx: true } },
      plugins: ['react', 'react-hooks'],
      extends: ['plugin:react/recommended', 'plugin:react-hooks/recommended'],
      settings: { react: { version: 'detect' } },
      rules: {
        'react/react-in-jsx-scope': 'off',
        'react/prop-types': 'off',
      },
    },
    {
      files: ['server/**/*.js'],
      env: { node: true, browser: false },
      rules: {
        'no-console': ['warn', { allow: ['log', 'warn', 'error'] }],
      },
    },
  ],
};
