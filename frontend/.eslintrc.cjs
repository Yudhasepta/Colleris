module.exports = {
  root: true,
  env: { browser: true, es2021: true },
  extends: [
    'react-app',
  ],
  ignorePatterns: ['dist', '.eslintrc.cjs', 'vite.config.js'],
  plugins: ['react-hooks'],
  rules: {
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'warn',
  },
}
