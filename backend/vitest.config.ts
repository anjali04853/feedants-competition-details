import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    testTimeout: 60_000,
    hookTimeout: 120_000,
    // Integration suites share one in-memory MongoDB per file; run files serially.
    fileParallelism: false,
    env: {
      NODE_ENV: 'test',
      ENABLE_DEV_LOGIN: 'true',
      UPLOAD_DIR: 'uploads-test',
      JWT_SECRET: 'test-secret-test-secret',
      PAYMENT_WEBHOOK_SECRET: 'test-payment-secret',
    },
  },
});
