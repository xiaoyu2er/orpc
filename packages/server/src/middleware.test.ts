import type { DecoratedMiddleware, Middleware, MiddlewareMeta } from './middleware'
import { os } from '.'
import { decorateMiddleware } from './middleware'

describe('middleware', () => {
  it('just a function', () => {
    const mid: Middleware<
      { auth: boolean },
      { userId: string },
      unknown,
      unknown
    > = (input, context, meta) => {
      expectTypeOf(input).toEqualTypeOf<unknown>()
      expectTypeOf(context).toEqualTypeOf<{ auth: boolean }>()
      expectTypeOf(meta).toEqualTypeOf<MiddlewareMeta< unknown>>()

      return meta.next({ context: { userId: '1' } })
    }
  })

  it('expect required return if has extra context', () => {
    const mid: Middleware<
      { auth: boolean },
      { userId: string },
      unknown,
      unknown
    > = (input, context, meta) => {
      expectTypeOf(input).toEqualTypeOf<unknown>()
      expectTypeOf(context).toEqualTypeOf<{ auth: boolean }>()
      expectTypeOf(meta).toEqualTypeOf<MiddlewareMeta< unknown>>()

      return meta.next({ context: { userId: '1' } })
    }

    // @ts-expect-error mid must call next
    const mid2: Middleware<
      { auth: boolean },
      { userId: string },
      unknown,
      unknown
    > = (input, context, meta) => {
      expectTypeOf(input).toEqualTypeOf<unknown>()
      expectTypeOf(context).toEqualTypeOf<{ auth: boolean }>()
      expectTypeOf(meta).toEqualTypeOf<MiddlewareMeta< unknown>>()
    }

    // @ts-expect-error mid return invalid context
    const mid3: Middleware<
      { auth: boolean },
      { userId: string },
      unknown,
      unknown
    > = (input, context, meta) => {
      expectTypeOf(input).toEqualTypeOf<unknown>()
      expectTypeOf(context).toEqualTypeOf<{ auth: boolean }>()
      expectTypeOf(meta).toEqualTypeOf<MiddlewareMeta<unknown>>()

      return meta.next({
        context: {
          valid: false,
        },
      })
    }
  })
})

describe('decorateMiddleware', () => {
  it('infer types', () => {
    const mid = decorateMiddleware<
      { auth: boolean },
      { userId: string },
      { id: string },
      { name: string }
    >((input, context, meta) => {
      expectTypeOf(input).toEqualTypeOf<{ id: string }>()
      expectTypeOf(context).toEqualTypeOf<{ auth: boolean }>()
      expectTypeOf(meta).toEqualTypeOf<MiddlewareMeta<{ name: string }>>()

      return meta.next({
        context: {
          userId: '1',
        },
      })
    })

    expectTypeOf(mid).toEqualTypeOf<
      DecoratedMiddleware<
        { auth: boolean },
        { userId: string },
        { id: string },
        { name: string }
      >
    >()

    expectTypeOf(mid).toMatchTypeOf<
      Middleware<
        { auth: boolean },
        { userId: string },
        { id: string },
        { name: string }
      >
    >()
  })

  it('concat: infer types', () => {
    const mid = decorateMiddleware<
      { auth: boolean },
      undefined,
      { id: string },
      { name: string }
    >((_, __, meta) => meta.next({})).concat(async (input, context, meta) => {
      expectTypeOf(input).toEqualTypeOf<{ id: string }>()
      expectTypeOf(context).toEqualTypeOf<{ auth: boolean }>()
      expectTypeOf(meta).toEqualTypeOf<MiddlewareMeta<{ name: string }>>()

      return meta.next({
        context: {
          userId: '1',
        },
      })
    })

    expectTypeOf(mid).toEqualTypeOf<
      DecoratedMiddleware<
        { auth: boolean },
        { userId: string },
        { id: string },
        { name: string }
      >
    >()
  })

  it('concat: can expect input', () => {
    const mid = decorateMiddleware<
      { auth: boolean },
      undefined,
      unknown,
      unknown
    >((_, __, meta) => meta.next({}))
      .concat((input: { id: string }, _, meta) => meta.next({}))
      .concat((input: { status: string }, _, meta) => meta.next({}))

    expectTypeOf(mid).toEqualTypeOf<
      DecoratedMiddleware<
        { auth: boolean },
        undefined,
        { id: string } & { status: string },
        unknown
      >
    >()

    // MID2 isn't usable because input type is wrong
    const mid2 = mid.concat((input: { id: number }, _, meta) => meta.next({}))
    expectTypeOf(mid2).toMatchTypeOf<
      DecoratedMiddleware<
        { auth: boolean },
        undefined,
        { id: never, status: string },
        unknown
      >
    >()
  })

  it('concat: deep copy', () => {
    const middleware = decorateMiddleware((_, __, meta) => meta.next({}))
    const mid2 = middleware.concat((_, __, meta) => meta.next({}))
    expect(mid2).not.toBe(middleware)
  })

  it('concat: can map input', async () => {
    const middleware = decorateMiddleware<
      { auth: boolean },
      undefined,
      unknown,
      unknown
    >((_, __, meta) => meta.next({}))

    const mid2 = middleware.concat(
      (input: { postId: number }, _, meta) => meta.next({ context: { a: 'a' } }),
      input => ({ postId: 12455 }),
    )

    // mid2 input is unknown, because it's map input does not expect anything
    expectTypeOf(mid2).toEqualTypeOf<
      DecoratedMiddleware<{ auth: boolean }, { a: string }, unknown, unknown>
    >()

    const fn = vi.fn()
    const mid3 = middleware.concat(
      (input: { postId: string }, _, meta) => {
        fn()
        expect(input).toEqual({ postId: '123' })

        return meta.next({})
      },
      (input: { postId: number }) => {
        fn()
        expect(input).toEqual({ postId: 123 })
        return {
          postId: `${input.postId}`,
        }
      },
    )

    await mid3({ postId: 123 }, {} as any, { next: () => {} } as any)
    expect(fn).toHaveBeenCalledTimes(2)

    // INPUT now follow expect types from map not from middleware
    expectTypeOf(mid3).toMatchTypeOf<
      DecoratedMiddleware<
        { auth: boolean },
        undefined,
        { postId: number },
        unknown
      >
    >()
  })

  it('mapInput', async () => {
    const fn = vi.fn()

    const mid = decorateMiddleware<
      undefined,
      undefined,
      { id: string },
      unknown
    >(fn).mapInput((input: { postId: string }) => {
      return { id: input.postId }
    })

    expectTypeOf(mid).toEqualTypeOf<
      DecoratedMiddleware<undefined, undefined, { postId: string }, unknown>
    >()

    await mid({ postId: '1' }, undefined, {} as any)

    expect(fn).toHaveBeenCalledWith({ id: '1' }, undefined, {})
  })
})

it('middleware can output', async () => {
  let mid2Called = false
  let handlerCalled = false
  const ping = os
    .use((input, ctx, meta) => {
      return meta.output('from middleware')
    })
    .use((input, ctx, meta) => {
      mid2Called = true
      return meta.output('from middleware 2')
    })
    .func(() => {
      handlerCalled = true
      return 'from handler'
    })

  expect(await ping(undefined)).toBe('from middleware')
  expect(mid2Called).toBeFalsy()
  expect(handlerCalled).toBeFalsy()
})
