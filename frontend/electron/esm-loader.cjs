const { resolve } = require('path');

module.exports = {
  resolve: {
    alias: {
      '@': resolve(__dirname, '../src'),
    },
  },
  esm: {
    patterns: ['**/*.js', '**/*.ts', '**/*.tsx'],
  },
};