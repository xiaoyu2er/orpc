import type { Meta } from './types'
import {
  type DecoratedMiddleware,
  decorateMiddleware,
  type Middleware,
} from './middleware'

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
      expectTypeOf(meta).toEqualTypeOf<Meta<unknown>>()

      return {
        context: {
          userId: '1',
        },
      }
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
      expectTypeOf(meta).toEqualTypeOf<Meta<unknown>>()

      return {
        context: {
          userId: '1',
        },
      }
    }

    // @ts-expect-error mid is not return extra context
    const mid2: Middleware<
      { auth: boolean },
      { userId: string },
      unknown,
      unknown
    > = (input, context, meta) => {
      expectTypeOf(input).toEqualTypeOf<unknown>()
      expectTypeOf(context).toEqualTypeOf<{ auth: boolean }>()
      expectTypeOf(meta).toEqualTypeOf<Meta<unknown>>()
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
      expectTypeOf(meta).toEqualTypeOf<Meta<unknown>>()

      return {
        context: {
          valid: false,
        },
      }
    }
  })

  it('not allow return if has no extra context', () => {
    const mid: Middleware<{ auth: boolean }, undefined, unknown, unknown> = (
      input,
      context,
      meta,
    ) => {
      expectTypeOf(input).toEqualTypeOf<unknown>()
      expectTypeOf(context).toEqualTypeOf<{ auth: boolean }>()
      expectTypeOf(meta).toEqualTypeOf<Meta<unknown>>()
    }

    // @ts-expect-error mid2 is not return extra context
    const mid2: Middleware<{ auth: boolean }, undefined, unknown, unknown> = (
      input,
      context,
      meta,
    ) => {
      expectTypeOf(input).toEqualTypeOf<unknown>()
      expectTypeOf(context).toEqualTypeOf<{ auth: boolean }>()
      expectTypeOf(meta).toEqualTypeOf<Meta<unknown>>()

      return {
        context: {
          userId: '1',
        },
      }
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
      expectTypeOf(meta).toEqualTypeOf<Meta<{ name: string }>>()

      return {
        context: {
          userId: '1',
        },
      }
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
    >(() => {}).concat((input, context, meta) => {
      expectTypeOf(input).toEqualTypeOf<{ id: string }>()
      expectTypeOf(context).toEqualTypeOf<{ auth: boolean }>()
      expectTypeOf(meta).toEqualTypeOf<Meta<{ name: string }>>()

      return {
        context: {
          userId: '1',
        },
      }
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
    >(() => {})
      .concat((input: { id: string }) => {})
      .concat((input: { status: string }) => {})

    expectTypeOf(mid).toEqualTypeOf<
      DecoratedMiddleware<
        { auth: boolean },
        undefined,
        { id: string } & { status: string },
        unknown
      >
    >()

    // MID2 isn't usable because input type is wrong
    const mid2 = mid.concat((input: { id: number }) => {})
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
    const middleware = decorateMiddleware(() => {})
    const mid2 = middleware.concat(() => {})
    expect(mid2).not.toBe(middleware)
  })

  it('concat: can map input', async () => {
    const middleware = decorateMiddleware<
      { auth: boolean },
      undefined,
      unknown,
      unknown
    >(() => {})

    const mid2 = middleware.concat(
      (input: { postId: number }) => {
        return { context: { a: 'a' } }
      },
      input => ({ postId: 12455 }),
    )

    // mid2 input is unknown, because it's map input does not expect anything
    expectTypeOf(mid2).toEqualTypeOf<
      DecoratedMiddleware<{ auth: boolean }, { a: string }, unknown, unknown>
    >()

    const fn = vi.fn()
    const mid3 = middleware.concat(
      (input: { postId: string }) => {
        fn()
        expect(input).toEqual({ postId: '123' })
      },
      (input: { postId: number }) => {
        fn()
        expect(input).toEqual({ postId: 123 })
        return {
          postId: `${input.postId}`,
        }
      },
    )

    await mid3({ postId: 123 }, {} as any, {} as any)
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
