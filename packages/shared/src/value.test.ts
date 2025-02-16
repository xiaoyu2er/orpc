import { value } from './value'

it('value', async () => {
  expect(await value(42)).toBe(42)
  expect(await value(() => 42)).toBe(42)
  expect(await value(async () => 42)).toBe(42)

  expect(await value(async () => ({
    then: (resolve: (value: number) => void) => resolve(42),
  }))).toBe(42)

  expect(await value(() => ({ value: '42' }))).toEqual({ value: '42' })
})
