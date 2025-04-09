import { describe } from 'vitest'
import { StrictGetMethodPlugin } from '../../plugins'
import { initDefaultStandardRPCHandlerOptions } from './rpc-handler'

describe('initDefaultStandardRPCHandlerOptions', () => {
  it('should add StrictGetMethodPlugin by default', () => {
    const options = {} as any

    initDefaultStandardRPCHandlerOptions(options)

    expect(options.plugins).toEqual([
      new StrictGetMethodPlugin(),
    ])
  })

  it('should not add StrictGetMethodPlugin when disabled', () => {
    const options = {
      strictGetMethodPluginEnabled: false,
    } as any

    initDefaultStandardRPCHandlerOptions(options)

    expect(options.plugins).toEqual([])
  })
})
