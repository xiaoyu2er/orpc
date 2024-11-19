/**
 * This file is where you can play with type of oRPC React.
 */

import { createORPCReact } from '@orpc/react'
import type { contract } from './contract'

const { orpc } = createORPCReact<typeof contract>()

const listQuery = orpc.planet.list.useInfiniteQuery({
  input: {},
  getNextPageParam: (lastPage) => (lastPage.at(-1)?.id ?? -1) + 1,
})

const utils = orpc.useUtils()

utils.planet.invalidate()

const queries = orpc.useQueries((o) => [
  o.planet.find({ id: 1 }),
  o.planet.list({}),
])
