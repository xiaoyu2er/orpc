import { defineWorkspace } from 'vitest/config'

export default defineWorkspace([
  {
    test: {
      globals: true,
      include: ['**/*.test.ts'],
    },
  },
  {
    test: {
      globals: true,
      setupFiles: ['./packages/openapi/vitest.setup.ts'],
      include: ['./packages/openapi/**/*.test.ts'],
    },
  },
])
