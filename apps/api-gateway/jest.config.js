module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  transform: { '^.+\\.ts$': 'ts-jest' },
  collectCoverageFrom: ['**/*.(t|j)s'],
  coverageDirectory: '../coverage',
  testEnvironment: 'node',
  testTimeout: 30000,
  moduleNameMapper: {
    '^@moveflow/types(.*)$': '<rootDir>/../../../packages/types/src$1',
  },
  projects: [
    {
      displayName: 'unit',
      rootDir: 'src',
      testRegex: '.*\\.spec\\.ts$',
      testPathIgnorePatterns: ['/node_modules/', 'integration\\.spec\\.ts$'],
      transform: { '^.+\\.ts$': 'ts-jest' },
      testEnvironment: 'node',
      moduleNameMapper: {
        '^@moveflow/types(.*)$': '<rootDir>/../../../packages/types/src$1',
      },
    },
    {
      displayName: 'test',
      rootDir: '<rootDir>/test',
      testRegex: '(authorization-guard|tenant-isolation)\\.spec\\.ts$',
      testPathIgnorePatterns: ['/node_modules/', 'integration\\.spec\\.ts$'],
      transform: { '^.+\\.ts$': 'ts-jest' },
      testEnvironment: 'node',
      moduleNameMapper: {
        '^@moveflow/types(.*)$': '<rootDir>/../../packages/types/src$1',
      },
    },
  ],
};
