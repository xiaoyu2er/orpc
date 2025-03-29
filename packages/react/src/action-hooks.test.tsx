import { ORPCError, os } from '@orpc/server'
import { renderHook } from '@testing-library/react'
import { act } from 'react'
import { baseErrorMap, inputSchema, outputSchema } from '../../contract/tests/shared'
import { useServerAction } from './action-hooks'

describe('useServerAction', () => {
  const action = os
    .input(inputSchema.optional())
    .errors(baseErrorMap)
    .output(outputSchema)
    .handler(async ({ input }) => {
      return { output: Number(input) }
    })
    .actionable()

  it('on success', async () => {
    const { result } = renderHook(() => useServerAction(action))

    act(async () => {
      expect(result.current.status).toBe('idle')
      expect(result.current.isIdle).toBe(true)
      expect(result.current.isPending).toBe(false)
      expect(result.current.isSuccess).toBe(false)
      expect(result.current.isError).toBe(false)
      expect(result.current.input).toBe(undefined)
      expect(result.current.data).toBe(undefined)
      expect(result.current.error).toBe(null)

      result.current.execute({ input: 123 })

      expect(result.current.status).toBe('pending')
      expect(result.current.isIdle).toBe(false)
      expect(result.current.isPending).toBe(true)
      expect(result.current.isSuccess).toBe(false)
      expect(result.current.isError).toBe(false)
      expect(result.current.input).toEqual({ input: 123 })
      expect(result.current.data).toBe(undefined)
      expect(result.current.error).toBe(null)

      await vi.waitUntil(() => result.current.status === 'success')
      expect(result.current.isIdle).toBe(false)
      expect(result.current.isPending).toBe(false)
      expect(result.current.isSuccess).toBe(true)
      expect(result.current.isError).toBe(false)
      expect(result.current.input).toEqual({ input: 123 })
      expect(result.current.data).toEqual({ output: '123' })
      expect(result.current.error).toBe(null)

      result.current.reset()

      expect(result.current.status).toBe('idle')
      expect(result.current.isIdle).toBe(true)
      expect(result.current.isPending).toBe(false)
      expect(result.current.isSuccess).toBe(false)
      expect(result.current.isError).toBe(false)
      expect(result.current.input).toBe(undefined)
      expect(result.current.data).toBe(undefined)
      expect(result.current.error).toBe(null)
    })
  })

  it('on error', async () => {
    const { result } = renderHook(() => useServerAction(action))

    act(async () => {
      expect(result.current.status).toBe('idle')
      expect(result.current.isIdle).toBe(true)
      expect(result.current.isPending).toBe(false)
      expect(result.current.isSuccess).toBe(false)
      expect(result.current.isError).toBe(false)
      expect(result.current.input).toBe(undefined)
      expect(result.current.data).toBe(undefined)
      expect(result.current.error).toBe(null)

      // @ts-expect-error --- invalid input
      result.current.execute({ input: 'invalid' })

      expect(result.current.status).toBe('pending')
      expect(result.current.isIdle).toBe(false)
      expect(result.current.isPending).toBe(true)
      expect(result.current.isSuccess).toBe(false)
      expect(result.current.isError).toBe(false)
      expect(result.current.input).toEqual({ input: 'invalid' })
      expect(result.current.data).toBe(undefined)
      expect(result.current.error).toBe(null)

      await vi.waitUntil(() => result.current.status === 'error')
      expect(result.current.isIdle).toBe(false)
      expect(result.current.isPending).toBe(false)
      expect(result.current.isSuccess).toBe(false)
      expect(result.current.isError).toBe(true)
      expect(result.current.input).toEqual({ input: 'invalid' })
      expect(result.current.data).toBe(undefined)
      expect(result.current.error).toBeInstanceOf(ORPCError)

      result.current.reset()

      expect(result.current.status).toBe('idle')
      expect(result.current.isIdle).toBe(true)
      expect(result.current.isPending).toBe(false)
      expect(result.current.isSuccess).toBe(false)
      expect(result.current.isError).toBe(false)
      expect(result.current.input).toBe(undefined)
      expect(result.current.data).toBe(undefined)
      expect(result.current.error).toBe(null)
    })
  })
})
