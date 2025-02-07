import { computed, ref } from 'vue'
import { createGeneralUtils } from './general-utils'
import * as keyModule from './key'

const buildKeySpy = vi.spyOn(keyModule, 'buildKey')

beforeEach(() => {
  vi.clearAllMocks()
})

describe('createGeneralUtils', () => {
  const utils = createGeneralUtils(['path'])

  it('.key', () => {
    expect(
      utils.key({ input: computed(() => ({ search: ref('__search__') })), type: 'infinite' }),
    ).toEqual([['path'], { input: { search: '__search__' }, type: 'infinite' }])
    expect(buildKeySpy).toHaveBeenCalledTimes(1)
    expect(buildKeySpy).toHaveBeenCalledWith(['path'], { input: { search: '__search__' }, type: 'infinite' })
  })
})
