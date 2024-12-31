import type { RouterClient } from '@orpc/server'
import type { router } from 'examples/server'
import { createORPCVueColadaUtils } from '@orpc/vue-colada'

export const orpc = createORPCVueColadaUtils({} as RouterClient<typeof router /** or contract router */, unknown>)
