import { createGeneralUtils } from './general-utils'
import * as keyModule from './key'

const buildKeySpy = vi.spyOn(keyModule, 'buildKey')

beforeEach(() => {
  vi.clearAllMocks()
})

describe('createGeneralUtils', () => {
  const utils = createGeneralUtils(['path'])

  it('.key', () => {
    expect(utils.key({ input: '__input__', type: 'infinite' })).toEqual([['path'], { input: '__input__', type: 'infinite' }])
    expect(buildKeySpy).toHaveBeenCalledTimes(1)
    expect(buildKeySpy).toHaveBeenCalledWith(['path'], { input: '__input__', type: 'infinite' })
  })
})
