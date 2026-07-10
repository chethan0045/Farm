module.exports = {
  testEnvironment: 'node',
  setupFiles: ['<rootDir>/tests/env-setup.js'],
  setupFilesAfterEnv: ['<rootDir>/tests/db-setup.js'],
  testMatch: ['<rootDir>/tests/**/*.test.js'],
  testTimeout: 30000,
  // Model files register mongoose models at require time; a single worker
  // avoids duplicate-model and port juggling across suites.
  maxWorkers: 1
};
