import * as keyModule from '@orpc/tanstack-query'
import { createGeneralUtils } from './general-utils'

const buildKeySpy = vi.spyOn(keyModule, 'buildKey')

beforeEach(() => {
  vi.clearAllMocks()
})

describe('createGeneralUtils', () => {
  const utils = createGeneralUtils(['path'])

  it('.key', () => {
    expect(
      utils.key({ input: { search: '__search__' }, type: 'infinite' }),
    ).toEqual(
      buildKeySpy.mock.results[0]!.value,
    )

    expect(buildKeySpy).toHaveBeenCalledTimes(1)
    expect(buildKeySpy).toHaveBeenCalledWith(['path'], { input: { search: '__search__' }, type: 'infinite' })
  })
})
