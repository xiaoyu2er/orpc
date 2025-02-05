import { defineConfig } from 'tsup'

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    plugins: 'src/adapters/plugins/index.ts',
    standard: 'src/adapters/standard/index.ts',
    fetch: 'src/adapters/fetch/index.ts',
    node: 'src/adapters/node/index.ts',
    next: 'src/adapters/next/index.ts',
    hono: 'src/adapters/hono/index.ts',
  },
  sourcemap: true,
  clean: true,
  format: 'esm',
})
