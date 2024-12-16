import type { DecoratedLazy, Lazy } from './lazy'
import type { Procedure } from './procedure'
import type { AdaptedRouter } from './router-builder'
import type { WELL_CONTEXT } from './types'
import { z } from 'zod'
import { createLazy } from './lazy'
import { RouterBuilder } from './router-builder'

const mid1 = vi.fn()
const mid2 = vi.fn()

const builder = new RouterBuilder<{ auth: boolean }, { db: string }>({
  middlewares: [mid1, mid2],
  prefix: '/prefix',
  tags: ['tag1', 'tag2'],
})

describe('self chainable', () => {
  it('prefix', () => {
    const prefixed = builder.prefix('/test')
    expect(prefixed).not.toBe(builder)
    expect(prefixed).toBeInstanceOf(RouterBuilder)
    expect(prefixed['~orpc'].prefix).toBe('/prefix/test')
  })

  it('tag', () => {
    const tagged = builder.tag('test1', 'test2')
    expect(tagged).not.toBe(builder)
    expect(tagged).toBeInstanceOf(RouterBuilder)
    expect(tagged['~orpc'].tags).toEqual(['tag1', 'tag2', 'test1', 'test2'])
  })

  it('use middleware', () => {
    const mid3 = vi.fn()
    const mid4 = vi.fn()

    const applied = builder.use(mid3).use(mid4)
    expect(applied).not.toBe(builder)
    expect(applied).toBeInstanceOf(RouterBuilder)
    expect(applied['~orpc'].middlewares).toEqual([mid1, mid2, mid3, mid4])
  })
})

describe('to AdaptedRouter', () => {
  const schema = z.object({ val: z.string().transform(v => Number.parseInt(v)) })
  const ping = {} as Procedure<{ auth: boolean }, { db: string }, typeof schema, typeof schema, { val: string }>
  const pong = {} as Procedure<WELL_CONTEXT, undefined, undefined, undefined, unknown>

  const wrongPing = {} as Procedure<{ auth: 'invalid' }, undefined, undefined, undefined, unknown>

  it('router without lazy', () => {
    expectTypeOf(builder.router({ ping, pong, nested: { ping, pong } })).toEqualTypeOf<
      AdaptedRouter<
        { auth: boolean },
        {
          ping: typeof ping
          pong: typeof pong
          nested: { ping: typeof ping, pong: typeof pong }
        }
      >
    >()

    builder.router({ ping })
    // @ts-expect-error - context is not match
    builder.router({ wrongPing })
  })

  it('router with lazy', () => {
    expectTypeOf(builder.router({
      ping: createLazy(() => Promise.resolve({ default: ping })),
      pong,
      nested: createLazy(() => Promise.resolve({
        default: {
          ping,
          pong: createLazy(() => Promise.resolve({ default: pong })),
        },
      })),
    })).toEqualTypeOf<
      AdaptedRouter<
        { auth: boolean },
        {
          ping: Lazy<typeof ping>
          pong: typeof pong
          nested: Lazy<{ ping: typeof ping, pong: Lazy<typeof pong> }>
        }
      >
    >()

    builder.router({ ping: createLazy(() => Promise.resolve({ default: ping })) })
    // @ts-expect-error - context is not match
    builder.router({ wrongPing: createLazy(() => Promise.resolve({ default: wrongPing })) })
  })
})

describe('to DecoratedLazy', () => {
  const schema = z.object({ val: z.string().transform(v => Number.parseInt(v)) })
  const ping = {} as Procedure<{ auth: boolean }, { db: string }, typeof schema, typeof schema, { val: string }>
  const pong = {} as Procedure<WELL_CONTEXT, undefined, undefined, undefined, unknown>

  const wrongPing = {} as Procedure<{ auth: 'invalid' }, undefined, undefined, undefined, unknown>

  it('router without lazy', () => {
    expectTypeOf(builder.lazy(() => Promise.resolve({
      default: {
        ping,
        pong,
        nested: {
          ping,
          pong,
        },
      },
    }))).toEqualTypeOf<
      DecoratedLazy<{
        ping: typeof ping
        pong: typeof pong
        nested: {
          ping: typeof ping
          pong: typeof pong
        }
      }>
    >()

    builder.lazy(() => Promise.resolve({ default: { ping } }))
    // @ts-expect-error - context is not match
    builder.lazy(() => Promise.resolve({ default: { wrongPing } }))
  })

  it('router with lazy', () => {
    expectTypeOf(builder.lazy(() => Promise.resolve({
      default: {
        ping: createLazy(() => Promise.resolve({ default: ping })),
        pong,
        nested: createLazy(() => Promise.resolve({
          default: {
            ping,
            pong: createLazy(() => Promise.resolve({ default: pong })),
          },
        })),
      },
    }))).toEqualTypeOf<
      DecoratedLazy<{
        ping: DecoratedLazy<typeof ping>
        pong: typeof pong
        nested: {
          ping: typeof ping
          pong: DecoratedLazy<typeof pong>
        }
      }>
    >()

    builder.lazy(() => Promise.resolve({ default: { ping: createLazy(() => Promise.resolve({ default: ping })) } }))
    // @ts-expect-error - context is not match
    builder.lazy(() => Promise.resolve({ default: { wrongPing: createLazy(() => Promise.resolve({ default: wrongPing })) } }))
  })
})
