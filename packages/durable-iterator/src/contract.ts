import type { AsyncIteratorClass } from '@orpc/shared'
import { oc, type } from '@orpc/contract'
import * as v from 'valibot'

export const durableIteratorContract = {
  subscribe: oc
    .route({ summary: 'Listen to durable iterator events' })
    .output(type<AsyncIteratorClass<any>>()),
  call: oc
    .route({ summary: 'Call a remote method' })
    .input(
      v.object({
        path: v.tupleWithRest([v.string()], v.string()),
        input: v.unknown(),
      }),
    ),
}
