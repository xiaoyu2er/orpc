import type { Procedure } from './procedure'
import type { InferRouterInputs, InferRouterOutputs, Router } from './router'
import type { WELL_CONTEXT } from './types'
import { oc } from '@orpc/contract'
import { z } from 'zod'
import { createLazy } from './lazy'

const schema = z.object({ val: z.string().transform(v => Number.parseInt(v)) })

const ping = {} as Procedure<{ auth: boolean }, { db: string }, typeof schema, typeof schema, { val: string }>
const pong = {} as Procedure<WELL_CONTEXT, undefined, undefined, undefined, unknown>

const router = {
  ping: createLazy(() => Promise.resolve({ default: ping })),
  pong,
  nested: {
    ping,
    pong,
  },
  lazy: createLazy(() => Promise.resolve({ default: {
    ping: createLazy(() => Promise.resolve({ default: ping })),
    pong,
    nested: createLazy(() => Promise.resolve({ default: {
      ping: createLazy(() => Promise.resolve({ default: ping })),
      pong,
    } })),
  } })),
}

it('InferRouterInputs', () => {
    type Inputs = InferRouterInputs<typeof router>

    expectTypeOf<Inputs['ping']>().toEqualTypeOf<{ val: string }>()
    expectTypeOf<Inputs['pong']>().toEqualTypeOf<unknown>()
    expectTypeOf<Inputs['nested']['ping']>().toEqualTypeOf<{ val: string }>()
    expectTypeOf<Inputs['nested']['pong']>().toEqualTypeOf<unknown>()
    expectTypeOf<Inputs['lazy']['ping']>().toEqualTypeOf<{ val: string }>()
    expectTypeOf<Inputs['lazy']['pong']>().toEqualTypeOf<unknown>()
    expectTypeOf<Inputs['lazy']['nested']['ping']>().toEqualTypeOf<{ val: string }>()
    expectTypeOf<Inputs['lazy']['nested']['pong']>().toEqualTypeOf<unknown>()
})

it('InferRouterOutputs', () => {
    type Outputs = InferRouterOutputs<typeof router>

    expectTypeOf<Outputs['ping']>().toEqualTypeOf<{ val: number }>()
    expectTypeOf<Outputs['pong']>().toEqualTypeOf<unknown>()
    expectTypeOf<Outputs['nested']['ping']>().toEqualTypeOf<{ val: number }>()
    expectTypeOf<Outputs['nested']['pong']>().toEqualTypeOf<unknown>()
    expectTypeOf<Outputs['lazy']['ping']>().toEqualTypeOf<{ val: number }>()
    expectTypeOf<Outputs['lazy']['pong']>().toEqualTypeOf<unknown>()
    expectTypeOf<Outputs['lazy']['nested']['ping']>().toEqualTypeOf<{ val: number }>()
    expectTypeOf<Outputs['lazy']['nested']['pong']>().toEqualTypeOf<unknown>()
})

describe('Router', () => {
  it('require match context', () => {
    const ping = {} as Procedure<{ auth: boolean }, { db: string }, undefined, undefined, unknown>
    const pong = {} as Procedure<{ auth: string }, undefined, undefined, undefined, unknown>

    const router: Router<{ auth: boolean, userId: string }, any> = {
      ping,
      // @ts-expect-error auth is not match
      pong,
      nested: {
        ping,
        // @ts-expect-error auth is not match
        pong,
      },

      pingLazy: createLazy(() => Promise.resolve({ default: ping })),
      // @ts-expect-error auth is not match
      pongLazy: createLazy(() => Promise.resolve({ default: pong })),

      nestedLazy1: createLazy(() => Promise.resolve({
        default: {
          ping,
        },
      })),

      nestedLazy2: createLazy(() => Promise.resolve({
        default: {
          ping: createLazy(() => Promise.resolve({ default: ping })),
        },
      })),

      // @ts-expect-error auth is not match
      nestedLazy3: createLazy(() => Promise.resolve({
        default: {
          pong,
        },
      })),

      // @ts-expect-error auth is not match
      nestedLazy4: createLazy(() => Promise.resolve({
        default: {
          nested: {
            pong: createLazy(() => Promise.resolve({ default: pong })),
          },
        },
      })),

      nestedLazy6: createLazy(() => Promise.resolve({
        default: {
          nested: createLazy(() => Promise.resolve({
            default: {
              pingLazy: createLazy(() => Promise.resolve({ default: ping })),
            },
          })),
        },
      })),

      // @ts-expect-error auth is not match
      nestedLazy5: createLazy(() => Promise.resolve({
        default: {
          nested: createLazy(() => Promise.resolve({
            default: {
              pongLazy: createLazy(() => Promise.resolve({ default: pong })),
            },
          })),
        },
      })),
    }
  })

  it('require match contract', () => {
    const contract = oc.router({
      ping: oc.input(schema),
      pong: oc.output(schema),

      nested: oc.router({
        ping: oc.input(schema),
        pong: oc.output(schema),
      }),
    })

    const ping = {} as Procedure<{ auth: boolean }, { db: string }, typeof schema, undefined, unknown>
    const pong = {} as Procedure<WELL_CONTEXT, undefined, undefined, typeof schema, { val: string }>

    const router1: Router<{ auth: boolean, userId: string }, typeof contract> = {
      ping,
      pong,
      nested: {
        ping,
        pong,
      },
    }

    const router2: Router<{ auth: boolean, userId: string }, typeof contract> = {
      ping,
      pong: createLazy(() => Promise.resolve({ default: pong })),
      nested: {
        ping: createLazy(() => Promise.resolve({ default: ping })),
        pong,
      },
    }

    const router3: Router<{ auth: boolean, userId: string }, typeof contract> = {
      ping: createLazy(() => Promise.resolve({ default: ping })),
      pong,
      nested: createLazy(() => Promise.resolve({
        default: {
          ping: createLazy(() => Promise.resolve({ default: ping })),
          pong,
        },
      })),
    }

    // @ts-expect-error missing
    const router4: Router<{ auth: boolean, userId: string }, typeof contract> = {}

    const router39: Router<{ auth: boolean, userId: string }, typeof contract> = {
      // @ts-expect-error wrong ping
      ping: pong,
      pong,
      nested: {
        ping,
        // @ts-expect-error wrong pong
        pong: ping,
      },
    }

    const router565: Router<{ auth: boolean, userId: string }, typeof contract> = {
      // @ts-expect-error wrong ping
      ping: createLazy(() => Promise.resolve({ default: pong })),
      pong,
      nested: {
        ping,
        // @ts-expect-error wrong pong
        pong: createLazy(() => Promise.resolve({ default: ping })),
      },
    }

    const router343: Router<{ auth: boolean, userId: string }, typeof contract> = {
      // @ts-expect-error wrong ping
      ping: createLazy(() => Promise.resolve({ default: pong })),
      pong,
      // @ts-expect-error wrong nested
      nested: createLazy(() => Promise.resolve({
        default: {
          ping: createLazy(() => Promise.resolve({ default: ping })),
          pong: createLazy(() => Promise.resolve({ default: ping })),
        },
      })),
    }
  })
})
