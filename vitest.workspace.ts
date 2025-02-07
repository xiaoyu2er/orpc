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
      environment: 'jsdom',
      setupFiles: ['./vitest.jsdom-react.ts'],
      include: [
        './packages/next/**/*.test.tsx',
        './packages/react-query/**/*.test.tsx',
        './packages/vue-colada/**/*.test.tsx',
        './packages/vue-query/**/*.test.tsx',
      ],
    },
  },
])
