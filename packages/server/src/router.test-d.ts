import type { InferRouterInputs, InferRouterOutputs } from '.'
import { z } from 'zod'
import { os } from '.'

const router = os.router({
  ping: os
    .input(z.object({ ping: z.string().transform(() => 1) }))
    .output(z.object({ pong: z.number().transform(() => '1') }))
    .func(() => ({ pong: 1 })),
  user: {
    find: os
      .input(z.object({ find: z.number().transform(() => '1') }))
      .func(() => ({ user: { id: 1 } }))
    ,
  },
})

it('InferRouterInputs', () => {
    type Inputs = InferRouterInputs<typeof router>

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

it('InferRouterOutputs', () => {
    type Outputs = InferRouterOutputs<typeof router>

    expectTypeOf<Outputs>().toEqualTypeOf<{
      ping: {
        pong: string
      }
      user: {
        find: {
          user: {
            id: number
          }
        }
      }
    }>()
})
