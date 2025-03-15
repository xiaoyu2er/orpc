'use server'

import { pub } from '@/orpc'
import { z } from 'zod'

export const getting = pub
  .input(z.object({
    name: z.string(),
  }))
  .output(z.string())
  .handler(async ({ input }) => {
    return `Hello ${input.name}!`
  })
  .actionable()
