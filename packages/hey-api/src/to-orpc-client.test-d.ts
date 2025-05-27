import type { NestedClient } from '../../client/src/types'
import type { Planet } from '../tests/client/types.gen'
import * as sdk from '../tests/client/sdk.gen'
import { experimental_toORPCClient } from './to-orpc-client'

describe('toORPCClient', () => {
  const client = experimental_toORPCClient({
    ...sdk,
    somethingElse: 123,
  })

  const c = sdk.listPlanets()

  it('satisfies nested client', () => {
    const _b: NestedClient<Record<never, never>> = client
  })

  it('inputs', async () => {
    client.listPlanets()

    client.listPlanets({
      query: {
        limit: 10,
        offset: 0,
      },
    })

    client.listPlanets({
      query: {
        // @ts-expect-error - invalid type
        limit: 'invalid',
      },
    })

    client.getPlanet({ path: { planetId: 'earth' } })
    // @ts-expect-error - path is required
    client.getPlanet()
    // @ts-expect-error - invalid type
    client.getPlanet({ path: { planetId: 123 } })
  })

  it('outputs', async () => {
    expectTypeOf(await client.listPlanets()).toEqualTypeOf<{ body: Planet[], request: Request, response: Response }>()
    expectTypeOf(await client.getPlanet({ path: { planetId: 'earth' } })).toEqualTypeOf<{ body: Planet, request: Request, response: Response }>()
    expectTypeOf(await client.createPlanet({ body: { name: 'Earth' } })).toEqualTypeOf<{ body: Planet, request: Request, response: Response }>()
  })
})
