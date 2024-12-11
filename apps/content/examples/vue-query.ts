import type { router } from 'examples/server'
import { createORPCVueQueryUtils } from '@orpc/vue-query'

export const orpc = createORPCVueQueryUtils<typeof router /** or contract router */>('fake-client' as any)
