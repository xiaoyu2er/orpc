import { hook, mergeContext } from './utils'

test('mergeContext', () => {
  expect(mergeContext(undefined, undefined)).toBe(undefined)
  expect(mergeContext(undefined, { foo: 'bar' })).toEqual({ foo: 'bar' })
  expect(mergeContext({ foo: 'bar' }, undefined)).toEqual({ foo: 'bar' })
  expect(mergeContext({ foo: 'bar' }, { foo: 'bar' })).toEqual({ foo: 'bar' })
  expect(mergeContext({ foo: 'bar' }, { bar: 'bar' })).toEqual({
    foo: 'bar',
    bar: 'bar',
  })
  expect(mergeContext({ foo: 'bar' }, { bar: 'bar', foo: 'bar1' })).toEqual({
    foo: 'bar1',
    bar: 'bar',
  })
})

describe('hook', async () => {
  it('on success', async () => {
    const onSuccess = vi.fn()
    const onError = vi.fn()
    const onFinish = vi.fn()

    await hook(async (hooks) => {
      hooks.onSuccess(onSuccess)
      hooks.onError(onError)
      hooks.onFinish(onFinish)

      return 'foo'
    })

    expect(onSuccess).toHaveBeenCalledWith('foo')
    expect(onError).not.toHaveBeenCalled()
    expect(onFinish).toHaveBeenCalledWith('foo', undefined)
  })

  it('on failed', async () => {
    const onSuccess = vi.fn()
    const onError = vi.fn()
    const onFinish = vi.fn()
    const error = new Error('foo')

    try {
      await hook(async (hooks) => {
        hooks.onSuccess(onSuccess)
        hooks.onError(onError)
        hooks.onFinish(onFinish)

        throw error
      })
    } catch (e) {
      expect(e).toBe(error)
    }

    expect(onSuccess).not.toHaveBeenCalled()
    expect(onError).toHaveBeenCalledWith(error)
    expect(onFinish).toHaveBeenCalledWith(undefined, error)
  })

  it('throw the last error', async () => {
    const error = new Error('foo')
    const error1 = new Error('1')
    const error2 = new Error('2')

    try {
      await hook(async (hooks) => {
        hooks.onSuccess(() => {
          throw error
        })
      })
    } catch (e) {
      expect(e).toBe(error)
    }

    try {
      await hook(async (hooks) => {
        hooks.onError(() => {
          throw error1
        })
      })
    } catch (e) {
      expect(e).toBe(error1)
    }

    try {
      await hook(async (hooks) => {
        hooks.onFinish(() => {
          throw error2
        })
      })
    } catch (e) {
      expect(e).toBe(error2)
    }

    try {
      await hook(async (hooks) => {
        hooks.onError((e) => {
          expect(e).toBe(error)
          throw error1
        })
        hooks.onFinish((_, error) => {
          expect(error).toBe(error1)
          throw error2
        })

        throw error
      })
    } catch (e) {
      expect(e).toBe(error2)
    }
  })

  it('can control order of hooks', async () => {
    const ref = { value: 0 }

    expect(
      hook(async (hooks) => {
        hooks.onSuccess((val) => {
          expect(val).toMatchObject({ value: 1 })
          ref.value++
        })
        hooks.onSuccess(
          (val) => {
            expect(val).toMatchObject({ value: 0 })
            ref.value++
          },
          { mode: 'unshift' },
        )
        hooks.onSuccess(
          (val) => {
            expect(val).toMatchObject({ value: 2 })
            ref.value++

            throw new Error('foo')
          },
          { mode: 'push' },
        )

        hooks.onFinish(() => {
          expect(ref).toMatchObject({ value: 7 })
          ref.value++
        })
        hooks.onFinish(
          () => {
            expect(ref).toMatchObject({ value: 6 })
            ref.value++
          },
          { mode: 'unshift' },
        )
        hooks.onFinish(
          () => {
            expect(ref).toMatchObject({ value: 8 })
            ref.value++
          },
          { mode: 'push' },
        )

        hooks.onError((e) => {
          expect(ref).toMatchObject({ value: 4 })
          ref.value++
        })

        hooks.onError(
          () => {
            expect(ref).toMatchObject({ value: 5 })
            ref.value++
          },
          { mode: 'push' },
        )

        hooks.onError(
          (e) => {
            expect(ref).toMatchObject({ value: 3 })
            ref.value++
          },
          { mode: 'unshift' },
        )

        return ref
      }),
    ).rejects.toThrow('foo')
  })

  it('ensure run every onSuccess and onFinish even on throw many times', async () => {
    const error = new Error('foo')
    const error1 = new Error('1')
    const error2 = new Error('2')

    const onError = vi.fn(() => {
      throw error
    })
    const onFinish = vi.fn(() => {
      throw error1
    })

    try {
      await hook(async (hooks) => {
        hooks.onError(onError)
        hooks.onError(onError)
        hooks.onError(onError)
        hooks.onFinish(onFinish)
        hooks.onFinish(onFinish)
        hooks.onFinish(onFinish)

        throw error2
      })
    } catch (e) {
      expect(e).toBe(error1)
    }

    expect(onError).toHaveBeenCalledTimes(3)
    expect(onFinish).toHaveBeenCalledTimes(3)
  })

  it('can unsubscribe', async () => {
    const onSuccess = vi.fn()
    const onError = vi.fn()
    const onFinish = vi.fn()

    await hook(async (hooks) => {
      hooks.onSuccess(onSuccess)()
      hooks.onSuccess(onSuccess)()
      hooks.onError(onError)()
      hooks.onFinish(onFinish)()

      return 'foo'
    })

    await expect(
      hook(async (hooks) => {
        hooks.onSuccess(onSuccess)()
        hooks.onSuccess(onSuccess)()
        hooks.onError(onError)()
        hooks.onFinish(onFinish)()

        throw new Error('foo')
      }),
    ).rejects.toThrow('foo')

    expect(onSuccess).not.toHaveBeenCalled()
    expect(onError).not.toHaveBeenCalled()
    expect(onFinish).not.toHaveBeenCalled()
  })
})
