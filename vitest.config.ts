import { configDefaults, defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // Bound concurrent jsdom/Sharp workers on the shared Windows service host.
    maxWorkers: 2,
    exclude: [...configDefaults.exclude, 'tests/browser/**'],
  },
})
