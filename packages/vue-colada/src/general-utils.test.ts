import { ref } from 'vue'
import { createGeneralUtils } from './general-utils'
import * as keyModule from './key'

const buildKeySpy = vi.spyOn(keyModule, 'buildKey')

beforeEach(() => {
  buildKeySpy.mockClear()
})

describe('key', () => {
  it('works', () => {
    const utils = createGeneralUtils(['path'])
    buildKeySpy.mockReturnValue(['__mocked__'])
    expect(utils.key({ input: 'input' })).toEqual(['__mocked__'])
    expect(buildKeySpy).toHaveBeenCalledTimes(1)
    expect(buildKeySpy).toHaveBeenCalledWith(['path'], { input: 'input' })
  })

  it('works with ref', () => {
    const utils = createGeneralUtils(['path'])

    buildKeySpy.mockReturnValue(['__mocked__'])

    expect(utils.key({ input: ref({ value: ref('input') }) }))
      .toEqual(['__mocked__'])
    expect(buildKeySpy).toHaveBeenCalledTimes(1)
    expect(buildKeySpy).toHaveBeenCalledWith(['path'], { input: { value: 'input' } })
  })
})
