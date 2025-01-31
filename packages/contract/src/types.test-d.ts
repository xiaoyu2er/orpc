import type { AbortSignal } from './types'

it('AbortSignal', () => {
  const controller = new AbortController()
  const signal = controller.signal

  expectTypeOf<AbortSignal>().toEqualTypeOf(signal)
})
