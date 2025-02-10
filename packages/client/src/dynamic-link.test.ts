import type { ClientOptions } from '@orpc/contract'
import { describe, expect, it, vi } from 'vitest'
import { DynamicLink } from './dynamic-link'

describe('dynamicLink', () => {
  it('works', async () => {
    const mockedLink = { call: vi.fn().mockResolvedValue('__mocked__') }
    const mockLinkResolver = vi.fn().mockResolvedValue(mockedLink)
    const link = new DynamicLink(mockLinkResolver)

    const path = ['users', 'getProfile']
    const input = { id: 123 }
    const options: ClientOptions<any> = {
      context: {
        batch: true,
      },
    }

    expect(await link.call(path, input, options)).toEqual('__mocked__')

    expect(mockLinkResolver).toHaveBeenCalledTimes(1)
    expect(mockLinkResolver).toHaveBeenCalledWith(path, input, options.context)
    expect(mockedLink.call).toHaveBeenCalledTimes(1)
    expect(mockedLink.call).toHaveBeenCalledWith(path, input, options)
  })

  it('works with undefined context', async () => {
    const mockedLink = { call: vi.fn().mockResolvedValue('__mocked__') }
    const mockLinkResolver = vi.fn().mockResolvedValue(mockedLink)
    const link = new DynamicLink(mockLinkResolver)

    const path = ['users', 'getProfile']
    const input = { id: 123 }
    const options: ClientOptions<any> = {
    }

    expect(await link.call(path, input, options)).toEqual('__mocked__')

    expect(mockLinkResolver).toHaveBeenCalledTimes(1)
    expect(mockLinkResolver).toHaveBeenCalledWith(path, input, {})
    expect(mockedLink.call).toHaveBeenCalledTimes(1)
    expect(mockedLink.call).toHaveBeenCalledWith(path, input, { ...options, context: {} })
  })
})
