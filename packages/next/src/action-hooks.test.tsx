import { os } from '@orpc/server'
import { renderHook } from '@testing-library/react'
import { z } from 'zod'
import { useAction } from './action-hooks'

describe('useAction', () => {
  const procedure = os.input(z.object({ value: z.string() })).func(async ({ value }) => {
    await new Promise(resolve => setTimeout(resolve, 100))
    return value
  })

  it('should work - on success', async () => {
    const { result } = renderHook(() => useAction(procedure))

    expect(result.current.status).toBe('idle')
    expect(result.current.isPending).toBe(false)
    expect(result.current.isError).toBe(false)
    expect(result.current.error).toBe(undefined)
    expect(result.current.data).toBe(undefined)

    result.current.execute({ value: 'hello' })

    await vi.waitFor(() => expect(result.current.status).toBe('pending'))
    expect(result.current.isPending).toBe(true)
    expect(result.current.isError).toBe(false)
    expect(result.current.error).toBe(undefined)
    expect(result.current.data).toBe(undefined)

    await vi.waitFor(() => expect(result.current.status).toBe('success'))
    expect(result.current.isPending).toBe(false)
    expect(result.current.isError).toBe(false)
    expect(result.current.error).toBe(undefined)
    expect(result.current.data).toBe('hello')

    result.current.reset()

    await vi.waitFor(() => expect(result.current.status).toBe('idle'))
    expect(result.current.isPending).toBe(false)
    expect(result.current.isError).toBe(false)
    expect(result.current.error).toBe(undefined)
    expect(result.current.data).toBe(undefined)
  })

  it('should work - on error', async () => {
    const { result } = renderHook(() => useAction(procedure))

    expect(result.current.status).toBe('idle')
    expect(result.current.isPending).toBe(false)
    expect(result.current.isError).toBe(false)
    expect(result.current.error).toBe(undefined)
    expect(result.current.data).toBe(undefined)

    // @ts-expect-error - invalid input
    result.current.execute({ value: 12334 })

    await vi.waitFor(() => expect(result.current.status).toBe('error'))
    expect(result.current.isPending).toBe(false)
    expect(result.current.isError).toBe(true)
    expect(result.current.data).toBe(undefined)
    expect(result.current.error?.message).toEqual('Validation input failed')
  })

  it('hooks', async () => {
    const onSuccess = vi.fn()
    const onError = vi.fn()

    const { result } = renderHook(() => useAction(procedure, { onSuccess, onError }))

    result.current.execute({ value: 'hello' }, { onSuccess, onError })

    await vi.waitFor(() => expect(result.current.status).toBe('success'))

    expect(onSuccess).toHaveBeenCalledTimes(2)
    expect(onSuccess).toHaveBeenNthCalledWith(1, 'hello', undefined, undefined)
    expect(onSuccess).toHaveBeenNthCalledWith(2, 'hello', undefined, undefined)

    expect(onError).not.toHaveBeenCalled()
  })
})
