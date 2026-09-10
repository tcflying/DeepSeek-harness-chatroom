import { playwright } from '@vitest/browser-playwright'
import { defineConfig } from 'vitest/config'

const executablePath = process.env.DSH_CHATROOM_BROWSER_EXECUTABLE_PATH

export default defineConfig({
  test: {
    include: ['tests/browser/**/*.test.ts'],
    fileParallelism: false,
    browser: {
      enabled: true,
      headless: true,
      api: { host: '127.0.0.1' },
      provider: playwright({
        ...(executablePath === undefined ? {} : { launchOptions: { executablePath } }),
      }),
      instances: [{ browser: 'chromium' }],
    },
  },
})
