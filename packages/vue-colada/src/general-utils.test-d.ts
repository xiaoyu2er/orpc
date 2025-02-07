import { ref } from 'vue'
import { createGeneralUtils } from './general-utils'

describe('key', () => {
  const utils = createGeneralUtils<{ a: { b: { c: number } } }>([])

  it('infer correct input type & input', () => {
    utils.key()
    utils.key({})
    utils.key({ input: { a: { b: { c: 1 } } } })

    utils.key({ input: { a: ref({ b: ref({ c: 1 }) }) } })

    // @ts-expect-error invalid input
    utils.key({ input: 123 })
    // @ts-expect-error invalid input
    utils.key({ input: { a: { b: { c: '1' } } } })

    // @ts-expect-error invalid input
    utils.key({ input: ref(123) })

    // @ts-expect-error invalid input
    utils.key({ type: 'ddd' })
  })
})
