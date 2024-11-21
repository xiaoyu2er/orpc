import type { router } from 'examples/server'
import { createORPCReact } from '@orpc/react'
// biome-ignore lint/correctness/noUnusedImports: <explanation>

export const { orpc, ORPCContext }
  = createORPCReact<typeof router /** or contract router */>()
