import type { Client } from './client'
import type { AbortSignal } from './types'

describe('client', () => {
  const fn: Client<unknown, string, number, Error> = async (...[input, options]) => {
    expectTypeOf(input).toEqualTypeOf<string>()
    expectTypeOf(options).toMatchTypeOf<({ context?: unknown, signal?: AbortSignal }) | undefined>()
    return 123
  }

  const fnWithOptionalInput: Client<unknown, string | undefined, number, Error> = async (...args) => {
    const [input, options] = args

    expectTypeOf(input).toEqualTypeOf<string | undefined>()
    expectTypeOf(options).toMatchTypeOf<{ context?: unknown, signal?: AbortSignal } | undefined>()
    return 123
  }

  it('just a function', () => {
    expectTypeOf(fn).toMatchTypeOf<(input: string, options: { context?: unknown, signal?: AbortSignal }) => Promise<number>>()
    expectTypeOf(fnWithOptionalInput).toMatchTypeOf<(input: string | undefined, options: { context?: unknown, signal?: AbortSignal }) => Promise<number>>()
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
    expectTypeOf(fnWithOptionalInput()).toMatchTypeOf<Promise<number>>()
    // @ts-expect-error - input is required
    expectTypeOf(fn()).toEqualTypeOf<Promise<number>>()
  })

  describe('context', () => {
    it('can accept context', () => {
      const client = {} as Client<{ userId: string }, { val: string }, { val: number }, Error>

      client({ val: '123' }, { context: { userId: '123' } })
      // @ts-expect-error - invalid context
      client({ val: '123' }, { context: { userId: 123 } })
      // @ts-expect-error - context is required
      client({ val: '123' })
    })

    it('optional options when context is optional', () => {
      const client = {} as Client<undefined | { userId: string }, { val: string }, { val: number }, Error>

      client({ val: '123' })
      client({ val: '123' }, { context: { userId: '123' } })
    })

    it('can call without args when both input and context are optional', () => {
      const client = {} as Client<undefined | { userId: string }, undefined | { val: string }, { val: number }, Error>

      client()
      client({ val: 'string' }, { context: { userId: '123' } })
      // @ts-expect-error - input is invalid
      client({ val: 123 }, { context: { userId: '123' } })
      // @ts-expect-error - context is invalid
      client({ val: '123' }, { context: { userId: 123 } })
    })
  })
})
