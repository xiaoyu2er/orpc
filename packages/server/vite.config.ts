import { defineConfig } from 'vite'

export default defineConfig({
  ssr: {
    noExternal: ['hono', 'radash'],
  },
  build: {
    ssr: true,
    sourcemap: true,
    lib: {
      entry: {
        index: 'src/index.ts',
      },
      formats: ['es'],
    },
  },
})
