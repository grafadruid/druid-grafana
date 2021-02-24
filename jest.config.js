module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/config/importJestDOM.ts'],
  testPathIgnorePatterns: ['<rootDir>/src/__tests__/config/'],
};
