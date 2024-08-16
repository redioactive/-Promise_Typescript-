import type {Config} from 'jest';

const config: Config = {
  clearMocks: true,
  collectCoverage: true,
  coverageDirectory: "coverage",
  coverageProvider: "v8",
  testEnvironment:'node',
  testMatch:["<rootDir>/test/reconfiguration.ts"]
};

export default config;
