import type {
  Builder,
  DecoratedMiddleware,
  DecoratedProcedure,
  Meta,
  MiddlewareMeta,
} from '.'
import { oc } from '@orpc/contract'
import { z } from 'zod'
import {
  isProcedure,
  os,
  ProcedureBuilder,
  ProcedureImplementer,
  RouterImplementer,
} from '.'
import { RouterBuilder } from './router-builder'

it('context method', () => {
  expectTypeOf<
    typeof os extends Builder<infer TContext, any> ? TContext : never
  >().toEqualTypeOf<undefined | Record<string, unknown>>()

  const os2 = os.context<{ foo: 'bar' }>()

  expectTypeOf<
    typeof os2 extends Builder<infer TContext, any> ? TContext : never
  >().toEqualTypeOf<{ foo: 'bar' }>()

  const os3 = os.context<{ foo: 'bar' }>().context()

  expectTypeOf<
    typeof os3 extends Builder<infer TContext, any> ? TContext : never
  >().toEqualTypeOf<{ foo: 'bar' }>()
})

describe('use middleware', () => {
  type Context = { auth: boolean }

  const osw = os.context<Context>()

  it('infer types', () => {
    osw.use((input, context, meta) => {
      expectTypeOf(input).toEqualTypeOf<unknown>()
      expectTypeOf(context).toEqualTypeOf<Context>()
      expectTypeOf(meta).toEqualTypeOf<MiddlewareMeta<unknown>>()

      return meta.next({})
    })
  })

  it('can map context', () => {
    osw
      .use((_, __, meta) => {
        return meta.next({ context: { userId: '1' } })
      })
      .use((_, context, meta) => {
        expectTypeOf(context).toMatchTypeOf<Context & { userId: string }>()

        return meta.next({})
      })
  })

  it('can map input', () => {
    osw
      // @ts-expect-error mismatch input
      .use((input: { postId: string }) => {})
      .use(
        (input: { postId: string }, _, meta) => {
          return meta.next({ context: { user: '1' } })
        },
        (input) => {
          expectTypeOf(input).toEqualTypeOf<unknown>()
          return { postId: '1' }
        },
      )
      .func((_, context) => {
        expectTypeOf(context).toMatchTypeOf<{ user: string }>()
      })
  })
})

describe('create middleware', () => {
  it('infer types', () => {
    const mid = os
      .context<{ auth: boolean }>()
      .middleware((input, context, meta) => {
        expectTypeOf(input).toEqualTypeOf<unknown>()
        expectTypeOf(context).toEqualTypeOf<{ auth: boolean }>()
        expectTypeOf(meta).toEqualTypeOf<MiddlewareMeta<any>>()

        return meta.next({ })
      })

    expectTypeOf(mid).toEqualTypeOf<
      DecoratedMiddleware<{ auth: boolean }, undefined, unknown, any>
    >()
  })

  it('map context', () => {
    const mid = os.context<{ auth: boolean }>().middleware((_, __, meta) => {
      return meta.next({ context: { userId: '1' } })
    })

    expectTypeOf(mid).toEqualTypeOf<
      DecoratedMiddleware<
        { auth: boolean },
        { userId: string },
        unknown,
        any
      >
    >()
  })
})

it('router method', () => {
  const pingContract = oc.input(z.string()).output(z.string())
  const userFindContract = oc
    .input(z.object({ id: z.string() }))
    .output(z.object({ name: z.string() }))

  const contract = oc.router({
    ping: pingContract,
    user: {
      find: userFindContract,
    },

    user2: oc.router({
      find: userFindContract,
    }),

    router: userFindContract,
  })

  const osw = os.contract(contract)

  expect(osw.ping).instanceOf(ProcedureImplementer)
  expect(osw.ping.zz$pi.contract).toEqual(pingContract)

  expect(osw.user).instanceOf(RouterImplementer)

  expect(osw.user.find).instanceOf(ProcedureImplementer)
  expect(osw.user.find.zz$pi.contract).toEqual(userFindContract)

  // Because of the router keyword is special, we can't use instanceof
  expect(osw.router.zz$pi.contract).toEqual(userFindContract)
  expect(
    osw.router.func(() => {
      return { name: '' }
    }),
  ).toSatisfy(isProcedure)
})

describe('define procedure builder', () => {
  const osw = os.context<{ auth: boolean }>()
  const schema1 = z.object({})
  const example1 = {}
  const schema2 = z.object({ a: z.string() })
  const example2 = { a: '' }

  it('input method', () => {
    const builder = osw.input(schema1, example1)

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
        },
      },
    })
  })

  it('output method', () => {
    const builder = osw.output(schema2, example2)

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
        },
      },
    })
  })

  it('route method', () => {
    const builder = osw.route({
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

  it('with middlewares', () => {
    const mid = os.middleware((_, __, meta) => {
      return meta.next({
        context: {
          userId: 'string',
        },
      })
    })

    const mid2 = os.middleware((_, __, meta) => {
      return meta.next({
        context: {
          mid2: true,
        },
      })
    })

    const osw = os.context<{ auth: boolean }>().use(mid).use(mid2)

    const builder1 = osw.input(schema1)
    const builder2 = osw.output(schema2)
    const builder3 = osw.route({ method: 'GET', path: '/test' })

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
    const osw = os.context<{ auth: boolean }>()

    const procedure = osw.func((input, context, meta) => {
      expectTypeOf(input).toEqualTypeOf<unknown>()
      expectTypeOf(context).toEqualTypeOf<{ auth: boolean }>()
      expectTypeOf(meta).toEqualTypeOf<Meta>()
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
    const mid = os.middleware((_, __, meta) => {
      return meta.next({
        context: {
          userId: 'string',
        },
      })
    })

    const osw = os.context<{ auth: boolean }>().use(mid)

    const procedure = osw.func((input, context, meta) => {
      expectTypeOf(input).toEqualTypeOf<unknown>()
      expectTypeOf(context).toMatchTypeOf<{ auth: boolean }>()
      expectTypeOf(meta).toEqualTypeOf<Meta>()
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

it('prefix', () => {
  const builder = os
    .context<{ auth: boolean }>()
    .use((_, __, meta) => {
      return meta.next({ context: { userId: '1' } })
    })
    .prefix('/api')

  expectTypeOf(builder).toEqualTypeOf<
    RouterBuilder<{ auth: boolean }, { userId: string }>
  >()

  expect(builder).instanceOf(RouterBuilder)
  expect(builder.zz$rb.prefix).toEqual('/api')
})

it('tags', () => {
  const builder = os
    .context<{ auth: boolean }>()
    .use((_, __, meta) => {
      return meta.next({ context: { userId: '1' } })
    })
    .tags('user', 'user2')

  expectTypeOf(builder).toEqualTypeOf<
    RouterBuilder<{ auth: boolean }, { userId: string }>
  >()

  expect(builder).instanceOf(RouterBuilder)
  expect(builder.zz$rb.tags).toEqual(['user', 'user2'])
})
