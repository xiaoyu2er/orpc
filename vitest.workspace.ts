import solid from 'vite-plugin-solid'
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
      setupFiles: ['./vitest.jsdom.ts'],
      include: [
        './packages/next/**/*.test.tsx',
        './packages/react-query/**/*.test.tsx',
        './packages/vue-colada/**/*.test.tsx',
        './packages/vue-query/**/*.test.tsx',
      ],
    },
  },
  {
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: ['./vitest.jsdom.ts'],
      include: [
        './packages/solid-query/**/*.test.tsx',
      ],
      deps: {
        inline: [/solid-js/, /@solidjs\/testing-library/],
      },
    },
    plugins: [solid()],
    resolve: {
      conditions: ['development', 'browser'],
    },
  },
])
