import { ioc } from '@orpc/contract'
import { z } from 'zod'
import {
  type Builder,
  type DecoratedMiddleware,
  type DecoratedProcedure,
  type Meta,
  ProcedureBuilder,
  ProcedureImplementer,
  RouterImplementer,
  ios,
  isProcedure,
} from '.'
import { RouterBuilder } from './router-builder'

test('context method', () => {
  const os = ios

  expectTypeOf<
    typeof os extends Builder<infer TContext, any> ? TContext : never
  >().toEqualTypeOf<undefined | Record<string, unknown>>()

  const os2 = ios.context<{ foo: 'bar' }>()

  expectTypeOf<
    typeof os2 extends Builder<infer TContext, any> ? TContext : never
  >().toEqualTypeOf<{ foo: 'bar' }>()

  const os3 = ios.context<{ foo: 'bar' }>().context()

  expectTypeOf<
    typeof os3 extends Builder<infer TContext, any> ? TContext : never
  >().toEqualTypeOf<{ foo: 'bar' }>()
})

describe('use middleware', () => {
  type Context = { auth: boolean }

  const os = ios.context<Context>()

  it('infer types', () => {
    os.use((input, context, meta) => {
      expectTypeOf(input).toEqualTypeOf<unknown>()
      expectTypeOf(context).toEqualTypeOf<Context>()
      expectTypeOf(meta).toEqualTypeOf<Meta<unknown>>()
    })
  })

  it('can map context', () => {
    os.use(() => {
      return { context: { userId: '1' } }
    }).use((_, context) => {
      expectTypeOf(context).toMatchTypeOf<Context & { userId: string }>()
    })
  })

  it('can map input', () => {
    os
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
    const mid = ios
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
    const mid = ios.context<{ auth: boolean }>().middleware(() => {
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
  const pingContract = ioc.input(z.string()).output(z.string())
  const userFindContract = ioc
    .input(z.object({ id: z.string() }))
    .output(z.object({ name: z.string() }))

  const contract = ioc.router({
    ping: pingContract,
    user: {
      find: userFindContract,
    },

    user2: ioc.router({
      find: userFindContract,
    }),

    router: userFindContract,
  })

  const os = ios.contract(contract)

  expect(os.ping).instanceOf(ProcedureImplementer)
  expect(os.ping.zz$pi.contract).toEqual(pingContract)

  expect(os.user).instanceOf(RouterImplementer)

  expect(os.user.find).instanceOf(ProcedureImplementer)
  expect(os.user.find.zz$pi.contract).toEqual(userFindContract)

  // Because of the router keyword is special, we can't use instanceof
  expect(os.router.zz$pi.contract).toEqual(userFindContract)
  expect(
    os.router.handler(() => {
      return { name: '' }
    }),
  ).toSatisfy(isProcedure)
})

describe('define procedure builder', () => {
  const os = ios.context<{ auth: boolean }>()
  const schema1 = z.object({})
  const example1 = {}
  const schema2 = z.object({ a: z.string() })
  const example2 = { a: '' }

  test('input method', () => {
    const builder = os.input(schema1, example1, { default: example1 })

    expectTypeOf(builder).toEqualTypeOf<
      ProcedureBuilder<{ auth: boolean }, undefined, typeof schema1, undefined>
    >()

    expect(builder).instanceOf(ProcedureBuilder)
    expect(builder.zz$pb.middlewares).toBe(undefined)
    expect(builder.zz$pb).toMatchObject({
      contract: {
        zz$cp: {
          InputSchema: schema1,
          inputExample: example1,
          inputExamples: { default: example1 },
        },
      },
    })
  })

  test('output method', () => {
    const builder = os.output(schema2, example2, { default: example2 })

    expectTypeOf(builder).toEqualTypeOf<
      ProcedureBuilder<{ auth: boolean }, undefined, undefined, typeof schema2>
    >()

    expect(builder).instanceOf(ProcedureBuilder)
    expect(builder.zz$pb.middlewares).toBe(undefined)
    expect(builder.zz$pb).toMatchObject({
      contract: {
        zz$cp: {
          OutputSchema: schema2,
          outputExample: example2,
          outputExamples: { default: example2 },
        },
      },
    })
  })

  test('route method', () => {
    const builder = os.route({
      method: 'GET',
      path: '/test',
      deprecated: true,
      description: 'des',
      summary: 'sum',
      tags: ['cccc'],
    })

    expectTypeOf(builder).toEqualTypeOf<
      ProcedureBuilder<{ auth: boolean }, undefined, undefined, undefined>
    >()

    expect(builder).instanceOf(ProcedureBuilder)
    expect(builder.zz$pb.middlewares).toBe(undefined)
    expect(builder.zz$pb).toMatchObject({
      contract: {
        zz$cp: {
          method: 'GET',
          path: '/test',
          deprecated: true,
          description: 'des',
          summary: 'sum',
          tags: ['cccc'],
        },
      },
    })
  })

  test('with middlewares', () => {
    const mid = ios.middleware(() => {
      return {
        context: {
          userId: 'string',
        },
      }
    })

    const mid2 = ios.middleware(() => {
      return {
        context: {
          mid2: true,
        },
      }
    })

    const os = ios.context<{ auth: boolean }>().use(mid).use(mid2)

    const builder1 = os.input(schema1)
    const builder2 = os.output(schema2)
    const builder3 = os.route({ method: 'GET', path: '/test' })

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
    const os = ios.context<{ auth: boolean }>()

    const procedure = os.handler((input, context, meta) => {
      expectTypeOf(input).toEqualTypeOf<unknown>()
      expectTypeOf(context).toEqualTypeOf<{ auth: boolean }>()
      expectTypeOf(meta).toEqualTypeOf<Meta<unknown>>()
    })

    expectTypeOf(procedure).toEqualTypeOf<
      DecoratedProcedure<
        { auth: boolean },
        undefined,
        undefined,
        undefined,
        void
      >
    >()

    expect(isProcedure(procedure)).toBe(true)
    expect(procedure.zz$p.middlewares).toBe(undefined)
  })

  it('with middlewares', () => {
    const mid = ios.middleware(() => {
      return {
        context: {
          userId: 'string',
        },
      }
    })

    const os = ios.context<{ auth: boolean }>().use(mid)

    const procedure = os.handler((input, context, meta) => {
      expectTypeOf(input).toEqualTypeOf<unknown>()
      expectTypeOf(context).toMatchTypeOf<{ auth: boolean }>()
      expectTypeOf(meta).toEqualTypeOf<Meta<unknown>>()
    })

    expectTypeOf(procedure).toEqualTypeOf<
      DecoratedProcedure<
        { auth: boolean },
        { userId: string },
        undefined,
        undefined,
        void
      >
    >()

    expect(isProcedure(procedure)).toBe(true)
    expect(procedure.zz$p.middlewares).toEqual([mid])
  })
})

test('prefix', () => {
  const builder = ios
    .context<{ auth: boolean }>()
    .use(() => {
      return { context: { userId: '1' } }
    })
    .prefix('/api')

  expectTypeOf(builder).toEqualTypeOf<
    RouterBuilder<{ auth: boolean }, { userId: string }>
  >()

  expect(builder).instanceOf(RouterBuilder)
  expect(builder.zz$rb.prefix).toEqual('/api')
})

test('tags', () => {
  const builder = ios
    .context<{ auth: boolean }>()
    .use(() => {
      return { context: { userId: '1' } }
    })
    .tags('user', 'user2')

  expectTypeOf(builder).toEqualTypeOf<
    RouterBuilder<{ auth: boolean }, { userId: string }>
  >()

  expect(builder).instanceOf(RouterBuilder)
  expect(builder.zz$rb.tags).toEqual(['user', 'user2'])
})
