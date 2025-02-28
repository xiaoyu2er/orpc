import { once } from './function'

it('once', () => {
  const fn = vi.fn(() => ({}))
  const onceFn = once(fn)

  expect(onceFn()).toBe(fn.mock.results[0]!.value)
  expect(onceFn()).toBe(fn.mock.results[0]!.value)
  expect(onceFn()).toBe(fn.mock.results[0]!.value)
  expect(onceFn()).toBe(fn.mock.results[0]!.value)
  expect(onceFn()).toBe(fn.mock.results[0]!.value)

  expect(fn).toHaveBeenCalledTimes(1)
})
