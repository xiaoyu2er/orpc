import { ref } from 'vue'
import { createGeneralUtils } from './utils-general'

describe('key', () => {
  const utils = createGeneralUtils<{ a: { b: { c: number } } }>([])

  it('infer correct input type & partial input', () => {
    utils.key()
    utils.key({})
    utils.key({ input: { a: { b: { c: 1 } } } })
    utils.key({ input: { a: ref({ b: ref({ c: 1 }) }) } })

    // @ts-expect-error c is missing
    utils.key({ input: { a: { b: { } } } })

    // @ts-expect-error invalid input
    utils.key({ input: 123 })
    // @ts-expect-error invalid input
    utils.key({ input: { a: { b: { c: '1' } } } })

    // @ts-expect-error invalid input
    utils.key({ input: ref(123) })
    // @ts-expect-error invalid type
    utils.key({ type: ref(123) })

    // @ts-expect-error invalid input
    utils.key({ type: 'ddd' })
  })
})
