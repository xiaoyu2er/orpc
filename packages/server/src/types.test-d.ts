import type { Caller, CallerOptions, MergeContext } from './types'

it('mergeContext', () => {
  expectTypeOf<MergeContext<undefined, undefined>>().toEqualTypeOf<undefined>()
  expectTypeOf<MergeContext<undefined, { foo: string }>>().toEqualTypeOf<{
    foo: string
  }>()
  expectTypeOf<MergeContext<{ foo: string }, undefined>>().toEqualTypeOf<{
    foo: string
  }>()
  expectTypeOf<MergeContext<{ foo: string }, { foo: string }>>().toEqualTypeOf<{
    foo: string
  }>()
  expectTypeOf<MergeContext<{ foo: string }, { bar: string }>>().toMatchTypeOf<{
    foo: string
    bar: string
  }>()
})

describe('Caller', () => {
  const fn: Caller<string, number> = async (input, options) => {
    expectTypeOf(input).toEqualTypeOf<string>()
    expectTypeOf(options).toEqualTypeOf<CallerOptions | undefined>()
    return 123
  }

  const fnWithOptionalInput: Caller<string | undefined, number> = async (...args) => {
    const [input, options] = args

    expectTypeOf(input).toEqualTypeOf<string | undefined>()
    expectTypeOf(options).toEqualTypeOf<CallerOptions | undefined>()
    return 123
  }

  it('just a function', () => {
    expectTypeOf(fn).toEqualTypeOf<(input: string, options?: CallerOptions) => Promise<number>>()
    expectTypeOf(fnWithOptionalInput).toMatchTypeOf<(input: string | undefined, options?: CallerOptions) => Promise<number>>()
  })

  it('infer correct input', () => {
    fn('123')
    fnWithOptionalInput('123')

    // @ts-expect-error - invalid input
    fn(123)
    // @ts-expect-error - invalid input
    fnWithOptionalInput(123)

    // @ts-expect-error - invalid input
    fn({})
    // @ts-expect-error - invalid input
    fnWithOptionalInput({})
  })

  it('accept signal', () => {
    fn('123', { signal: new AbortSignal() })
    fnWithOptionalInput('123', { signal: new AbortSignal() })

    // @ts-expect-error - invalid signal
    fn('123', { signal: 1234 })
    // @ts-expect-error - invalid signal
    fnWithOptionalInput('123', { signal: 1234 })
  })

  it('can accept call without args', () => {
    expectTypeOf(fnWithOptionalInput()).toEqualTypeOf<Promise<number>>()
    // @ts-expect-error - input is required
    expectTypeOf(fn()).toEqualTypeOf<Promise<number>>()
  })
})
