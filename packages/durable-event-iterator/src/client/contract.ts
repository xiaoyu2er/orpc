import type { AsyncIteratorClass } from '@orpc/shared'
import { oc, type } from '@orpc/contract'

export const durableEventIteratorContract = {
  subscribe: oc.output(type<AsyncIteratorClass<any>>()),
}
