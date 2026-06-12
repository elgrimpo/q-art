const nextJest = require('next/jest')

const createJestConfig = nextJest({ dir: './' })

module.exports = createJestConfig({
  testEnvironment: 'jest-environment-jsdom',
  testMatch: ['<rootDir>/src/__tests__/**/*.test.js'],
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/jest.setup.js'],
  moduleNameMapper: {
    // Force jose to use the Node CJS build (jsdom triggers browser export condition)
    '^jose(.*)$': '<rootDir>/node_modules/jose/dist/node/cjs$1',
  },
})
