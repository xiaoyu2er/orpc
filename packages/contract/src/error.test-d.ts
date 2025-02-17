import type { MergedErrorMap } from './error'

it('MergedErrorMap', () => {
  expectTypeOf<
    MergedErrorMap<{ BASE: { message: string } }, { INVALID: { message: string } }>
  >().toMatchTypeOf<{ BASE: { message: string }, INVALID: { message: string } }>()

  expectTypeOf<
    MergedErrorMap<{ BASE: { message: string }, INVALID: { status: number } }, { INVALID: { message: string } }>
  >().toMatchTypeOf<{ BASE: { message: string }, INVALID: { message: string } }>()
})
