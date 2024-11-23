import type { InferContractRouterInputs, InferContractRouterOutputs } from '.'
import { z } from 'zod'
import { oc } from '.'

const router = {
  ping: oc.route({
    method: 'GET',
    path: '/ping',
  })
    .input(z.object({
      ping: z.string().transform(() => 1),
    }))
    .output(z.object({
      pong: z.string().transform(() => 1),
    })),
  user: {
    find: oc.route({
      method: 'GET',
      path: '/users/{id}',
    })
      .input(z.object({
        find: z.number().transform(() => '1'),
      }))
      .output(z.object({
        user: z.object({
          id: z.number().transform(() => '1'),
        }),
      }))
    ,
  },
}

it('InferContractRouterInputs', () => {
  type Inputs = InferContractRouterInputs<typeof router>

  expectTypeOf<Inputs>().toEqualTypeOf<{
    ping: {
      ping: string
    }
    user: {
      find: {
        find: number
      }
    }
  }>()
})

it('InferContractRouterOutputs', () => {
  type Outputs = InferContractRouterOutputs<typeof router>

  expectTypeOf<Outputs>().toEqualTypeOf<{
    ping: {
      pong: number
    }
    user: {
      find: {
        user: {
          id: string
        }
      }
    }
  }>()
})
