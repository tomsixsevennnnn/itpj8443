/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testRegex: '.*\\.spec\\.ts$',
  moduleFileExtensions: ['js', 'json', 'ts'],
  setupFiles: ['<rootDir>/jest.setup.ts'],
  // เปิดด้วย --coverage ตอนรันจริง (pnpm test:cov) เท่านั้น — รัน pnpm test ปกติไม่ต้องคำนวณ coverage ทุกครั้งให้ช้าลง
  // .module.ts/main.ts/dto ตัดออกเพราะเป็น boilerplate ล้วนๆ ไม่มี logic ให้เทสต์จริง วัด coverage ไปก็ไม่มีความหมาย
  collectCoverageFrom: ['src/**/*.ts', '!src/**/*.spec.ts', '!src/**/*.module.ts', '!src/main.ts', '!src/**/dto/**'],
  coverageDirectory: 'coverage',
  coverageReporters: ['lcov', 'text-summary'],
}
