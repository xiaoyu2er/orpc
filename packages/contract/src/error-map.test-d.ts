import type { ErrorMapGuard, MergedErrorMap, StrictErrorMap } from './error-map'

it('ErrorMapGuard', () => {
  expectTypeOf<ErrorMapGuard<{ BASE: { message: string } }>>().toEqualTypeOf<{ BASE?: undefined }>()
})

it('StrictErrorMap', () => {
  expectTypeOf<StrictErrorMap<{ BASE: { message: string } }>>().toMatchTypeOf<{ BASE: { message: string, data?: undefined, status?: undefined } }>()
})

it('MergedErrorMap', () => {
  expectTypeOf<
    MergedErrorMap<{ BASE: { message: string } }, { INVALID: { message: string } }>
  >().toMatchTypeOf<{ BASE: { message: string }, INVALID: { message: string } }>()
})
