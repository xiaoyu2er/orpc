import { createORPCReact } from '@orpc/react'
import type { router } from 'examples/server'
// biome-ignore lint/correctness/noUnusedImports: <explanation>
import * as React from 'react'

export const { orpc, ORPCContext } =
  createORPCReact<typeof router /** or contract router */>()
