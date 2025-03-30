import type { Interceptor } from './interceptor'
import type { PromiseWithError } from './types'
import { onError, onFinish, onStart, onSuccess } from './interceptor'

it('onStart', () => {
  const interceptor: Interceptor<{ foo: string }, 'success', 'error'> = onStart((options) => {
    expectTypeOf(options.foo).toEqualTypeOf<string>()
    expectTypeOf(options.next).toBeCallableWith<[options?: { foo: string }]>()
    expectTypeOf(options.next()).toEqualTypeOf<PromiseWithError<'success', 'error'>>()
  })
})

it('onSuccess', () => {
  const interceptor: Interceptor<{ foo: string }, 'success', 'error'> = onSuccess((result, options) => {
    expectTypeOf(result).toEqualTypeOf<'success'>()

    expectTypeOf(options.foo).toEqualTypeOf<string>()
    expectTypeOf(options.next).toBeCallableWith<[options?: { foo: string }]>()
    expectTypeOf(options.next()).toEqualTypeOf<PromiseWithError<'success', 'error'>>()
  })
})

it('onError', () => {
  const interceptor: Interceptor<{ foo: string }, 'success', 'error'> = onError((error, options) => {
    expectTypeOf(error).toEqualTypeOf<'error'>()

    expectTypeOf(options.foo).toEqualTypeOf<string>()
    expectTypeOf(options.next).toBeCallableWith<[options?: { foo: string }]>()
    expectTypeOf(options.next()).toEqualTypeOf<PromiseWithError<'success', 'error'>>()
  })
})

it('onFinish', () => {
  const interceptor: Interceptor<{ foo: string }, 'success', 'error'> = onFinish((state, options) => {
    expectTypeOf(state).toEqualTypeOf<['success', null, 'success'] | [undefined, 'error', 'error']>()

    expectTypeOf(options.foo).toEqualTypeOf<string>()
    expectTypeOf(options.next).toBeCallableWith<[options?: { foo: string }]>()
    expectTypeOf(options.next()).toEqualTypeOf<PromiseWithError<'success', 'error'>>()
  })
})
