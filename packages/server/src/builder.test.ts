import {
  type DecoratedContractProcedure,
  initORPCContract,
} from '@orpc/contract'
import { z } from 'zod'
import {
  type Builder,
  type DecoratedMiddleware,
  DecoratedProcedure,
  type Meta,
  ProcedureBuilder,
  ProcedureImplementer,
  RouterImplementer,
  initORPC,
  isProcedure,
} from '.'
import type { RouterBuilder } from './router-builder'

test('context method', () => {
  const orpc = initORPC

  expectTypeOf<
    typeof orpc extends Builder<infer TContext, any> ? TContext : never
  >().toEqualTypeOf<undefined | Record<string, unknown>>()

  const orpc2 = initORPC.context<{ foo: 'bar' }>()

  expectTypeOf<
    typeof orpc2 extends Builder<infer TContext, any> ? TContext : never
  >().toEqualTypeOf<{ foo: 'bar' }>()

  const orpc3 = initORPC.context<{ foo: 'bar' }>().context()

  expectTypeOf<
    typeof orpc3 extends Builder<infer TContext, any> ? TContext : never
  >().toEqualTypeOf<{ foo: 'bar' }>()
})

describe('use middleware', () => {
  type Context = { auth: boolean }

  const orpc = initORPC.context<Context>()

  it('infer types', () => {
    orpc.use((input, context, meta) => {
      expectTypeOf(input).toEqualTypeOf<unknown>()
      expectTypeOf(context).toEqualTypeOf<Context>()
      expectTypeOf(meta).toEqualTypeOf<Meta<unknown>>()
    })
  })

  it('can map context', () => {
    orpc
      .use(() => {
        return { context: { userId: '1' } }
      })
      .use((_, context) => {
        expectTypeOf(context).toMatchTypeOf<Context & { userId: string }>()
      })
  })

  it('can map input', () => {
    orpc
      // @ts-expect-error mismatch input
      .use((input: { postId: string }) => {})
      .use(
        (input: { postId: string }) => {
          return { context: { user: '1' } }
        },
        (input) => {
          expectTypeOf(input).toEqualTypeOf<unknown>()
          return { postId: '1' }
        },
      )
      .handler((_, context) => {
        expectTypeOf(context).toMatchTypeOf<{ user: string }>()
      })
  })
})

describe('create middleware', () => {
  it('infer types', () => {
    const mid = initORPC
      .context<{ auth: boolean }>()
      .middleware((input, context, meta) => {
        expectTypeOf(input).toEqualTypeOf<unknown>()
        expectTypeOf(context).toEqualTypeOf<{ auth: boolean }>()
        expectTypeOf(meta).toEqualTypeOf<Meta<unknown>>()
      })

    expectTypeOf(mid).toEqualTypeOf<
      DecoratedMiddleware<{ auth: boolean }, undefined, unknown, unknown>
    >()
  })

  it('map context', () => {
    const mid = initORPC.context<{ auth: boolean }>().middleware(() => {
      return { context: { userId: '1' } }
    })

    expectTypeOf(mid).toEqualTypeOf<
      DecoratedMiddleware<
        { auth: boolean },
        { userId: string },
        unknown,
        unknown
      >
    >()
  })
})

test('router method', () => {
  const pingContract = initORPCContract.input(z.string()).output(z.string())
  const userFindContract = initORPCContract
    .input(z.object({ id: z.string() }))
    .output(z.object({ name: z.string() }))

  const contract = initORPCContract.router({
    ping: pingContract,
    user: {
      find: userFindContract,
    },

    user2: initORPCContract.router({
      find: userFindContract,
    }),

    router: userFindContract,
  })

  const orpc = initORPC.contract(contract)

  expect(orpc.ping).instanceOf(ProcedureImplementer)
  expect(orpc.ping.zz$pi.contract).toEqual(pingContract)

  expect(orpc.user).instanceOf(RouterImplementer)

  expect(orpc.user.find).instanceOf(ProcedureImplementer)
  expect(orpc.user.find.zz$pi.contract).toEqual(userFindContract)

  // Because of the router keyword is special, we can't use instanceof
  expect(orpc.router.zz$pi.contract).toEqual(userFindContract)
  expect(
    orpc.router.handler(() => {
      return { name: '' }
    }),
  ).toBeInstanceOf(DecoratedProcedure)
})

describe('define procedure builder', () => {
  const orpc = initORPC.context<{ auth: boolean }>()
  const schema1 = z.object({})
  const example1 = {}
  const schema2 = z.object({ a: z.string() })
  const example2 = { a: '' }

  test('input method', () => {
    const builder = orpc.input(schema1, example1, { default: example1 })

    expectTypeOf(builder).toEqualTypeOf<
      ProcedureBuilder<{ auth: boolean }, undefined, typeof schema1, undefined>
    >()

    expect(builder).instanceOf(ProcedureBuilder)
    expect(builder.zz$pb.middlewares).toBe(undefined)
    expect(builder.zz$pb).toMatchObject({
      InputSchema: schema1,
      inputExample: example1,
      inputExamples: { default: example1 },
    })
  })

  test('output method', () => {
    const builder = orpc.output(schema2, example2, { default: example2 })

    expectTypeOf(builder).toEqualTypeOf<
      ProcedureBuilder<{ auth: boolean }, undefined, undefined, typeof schema2>
    >()

    expect(builder).instanceOf(ProcedureBuilder)
    expect(builder.zz$pb.middlewares).toBe(undefined)
    expect(builder.zz$pb).toMatchObject({
      OutputSchema: schema2,
      outputExample: example2,
      outputExamples: { default: example2 },
    })
  })

  test('route method', () => {
    const builder = orpc.route({
      method: 'GET',
      path: '/test',
      deprecated: true,
      description: 'des',
      summary: 'sum',
    })

    expectTypeOf(builder).toEqualTypeOf<
      ProcedureBuilder<{ auth: boolean }, undefined, undefined, undefined>
    >()

    expect(builder).instanceOf(ProcedureBuilder)
    expect(builder.zz$pb.middlewares).toBe(undefined)
    expect(builder.zz$pb).toMatchObject({
      method: 'GET',
      path: '/test',
      deprecated: true,
      description: 'des',
      summary: 'sum',
    })
  })

  test('with middlewares', () => {
    const mid = initORPC.middleware(() => {
      return {
        context: {
          userId: 'string',
        },
      }
    })

    const mid2 = initORPC.middleware(() => {
      return {
        context: {
          mid2: true,
        },
      }
    })

    const orpc = initORPC.context<{ auth: boolean }>().use(mid).use(mid2)

    const builder1 = orpc.input(schema1)
    const builder2 = orpc.output(schema2)
    const builder3 = orpc.route({ method: 'GET', path: '/test' })

    expectTypeOf(builder1).toEqualTypeOf<
      ProcedureBuilder<
        { auth: boolean },
        { userId: string } & { mid2: boolean },
        typeof schema1,
        undefined
      >
    >()

    expectTypeOf(builder2).toEqualTypeOf<
      ProcedureBuilder<
        { auth: boolean },
        { userId: string } & { mid2: boolean },
        undefined,
        typeof schema2
      >
    >()

    expectTypeOf(builder3).toEqualTypeOf<
      ProcedureBuilder<
        { auth: boolean },
        { userId: string } & { mid2: boolean },
        undefined,
        undefined
      >
    >()

    expect(builder1.zz$pb.middlewares).toEqual([mid, mid2])
    expect(builder2.zz$pb.middlewares).toEqual([mid, mid2])
    expect(builder3.zz$pb.middlewares).toEqual([mid, mid2])
  })
})

describe('handler method', () => {
  it('without middlewares', () => {
    const orpc = initORPC.context<{ auth: boolean }>()

    const procedure = orpc.handler((input, context, meta) => {
      expectTypeOf(input).toEqualTypeOf<unknown>()
      expectTypeOf(context).toEqualTypeOf<{ auth: boolean }>()
      expectTypeOf(meta).toEqualTypeOf<Meta<unknown>>()
    })

    expectTypeOf(procedure).toEqualTypeOf<
      DecoratedProcedure<
        { auth: boolean },
        DecoratedContractProcedure<undefined, undefined>,
        undefined,
        void
      >
    >()

    expect(isProcedure(procedure)).toBe(true)
    expect(procedure.zz$p.middlewares).toBe(undefined)
  })

  it('with middlewares', () => {
    const mid = initORPC.middleware(() => {
      return {
        context: {
          userId: 'string',
        },
      }
    })

    const orpc = initORPC.context<{ auth: boolean }>().use(mid)

    const procedure = orpc.handler((input, context, meta) => {
      expectTypeOf(input).toEqualTypeOf<unknown>()
      expectTypeOf(context).toMatchTypeOf<{ auth: boolean }>()
      expectTypeOf(meta).toEqualTypeOf<Meta<unknown>>()
    })

    expectTypeOf(procedure).toEqualTypeOf<
      DecoratedProcedure<
        { auth: boolean },
        DecoratedContractProcedure<undefined, undefined>,
        { userId: string },
        void
      >
    >()

    expect(isProcedure(procedure)).toBe(true)
    expect(procedure.zz$p.middlewares).toEqual([mid])
  })
})

test('prefix', () => {
  const builder = initORPC
    .context<{ auth: boolean }>()
    .use(() => {
      return { context: { userId: '1' } }
    })
    .prefix('/api')

  expectTypeOf(builder).toEqualTypeOf<
    RouterBuilder<{ auth: boolean }, { userId: string }>
  >()

  expect(builder.zz$rb.prefix).toEqual('/api')
})
