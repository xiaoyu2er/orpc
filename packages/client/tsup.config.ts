import { defineConfig } from 'tsup'

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    standard: 'src/adapters/standard/index.ts',
    fetch: 'src/adapters/fetch/index.ts',
  },
  sourcemap: true,
  clean: true,
  format: 'esm',
})
