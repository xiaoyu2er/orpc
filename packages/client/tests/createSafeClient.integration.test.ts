import type { ClientContext, ClientLink } from '../src/types'
/**
 * Integration test demonstrating the createSafeClient functionality
 */
import { describe, expect, it, vi } from 'vitest'
import { createORPCClient } from '../src/client'
import { ORPCError } from '../src/error'
import { createSafeClient } from '../src/utils'

describe('createSafeClient integration', () => {
  it('should provide the desired API from the feature request', async () => {
    // Mock a successful response
    const mockSuccessLink: ClientLink<ClientContext> = {
      call: vi.fn().mockResolvedValue({ message: 'Hello, world!' }),
    }

    const client = createORPCClient(mockSuccessLink) as any
    const safeClient = createSafeClient(client)

    // This is the exact usage pattern requested in the issue:
    // const { error, data, isDefined } = await safeClient.doSomething({ id: '123' })
    const { error, data, isDefined } = await safeClient.doSomething({ id: '123' })

    expect(error).toBeNull()
    expect(data).toEqual({ message: 'Hello, world!' })
    expect(isDefined).toBe(false)
  })

  it('should handle errors gracefully without throwing', async () => {
    // Mock an error response
    const mockError = new ORPCError('BAD_REQUEST', { defined: true })
    const mockErrorLink: ClientLink<ClientContext> = {
      call: vi.fn().mockRejectedValue(mockError),
    }

    const client = createORPCClient(mockErrorLink) as any
    const safeClient = createSafeClient(client)

    // This should NOT throw an error
    const { error, data, isDefined } = await safeClient.doSomething({ id: '123' })

    expect(error).toBe(mockError)
    expect(data).toBeUndefined()
    expect(isDefined).toBe(true) // Because it's a defined ORPC error
  })

  it('should work with nested procedures', async () => {
    const mockLink: ClientLink<ClientContext> = {
      call: vi.fn().mockResolvedValue({ result: 'nested success' }),
    }

    const client = createORPCClient(mockLink) as any
    const safeClient = createSafeClient(client)

    // Test nested procedure calls
    const { error, data, isDefined } = await safeClient.user.profile.get({ userId: '123' })

    expect(error).toBeNull()
    expect(data).toEqual({ result: 'nested success' })
    expect(isDefined).toBe(false)
    expect(mockLink.call).toHaveBeenCalledWith(['user', 'profile', 'get'], { userId: '123' }, { context: {} })
  })

  it('should work with client options', async () => {
    const mockLink: ClientLink<ClientContext> = {
      call: vi.fn().mockResolvedValue({ result: 'success with options' }),
    }

    const client = createORPCClient(mockLink) as any
    const safeClient = createSafeClient(client)

    const controller = new AbortController()
    const { error, data } = await safeClient.doSomething(
      { id: '123' },
      { signal: controller.signal, context: { userId: 'user123' } },
    )

    expect(error).toBeNull()
    expect(data).toEqual({ result: 'success with options' })
    expect(mockLink.call).toHaveBeenCalledWith(
      ['doSomething'],
      { id: '123' },
      { signal: controller.signal, context: { userId: 'user123' } },
    )
  })
})
