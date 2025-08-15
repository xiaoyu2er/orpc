import { preventNativeAwait } from './proxy'

describe('preventNativeAwait', () => {
  it('should work normally if not awaited', () => {
    const obj = { value: 42 }
    const proxy = preventNativeAwait(obj)
    expect(proxy).toEqual(obj)

    const obj2 = { then: 323, catch: 123 }
    const proxy2 = preventNativeAwait(obj2)
    expect(proxy2).toEqual(obj2)

    const obj3 = { then: (...args: any[]) => ({ args }), catch: (...args: any[]) => ({ args }) }
    const proxy3 = preventNativeAwait(obj3)
    expect(proxy3.then(1, 2, 3)).toEqual({ args: [1, 2, 3] })
    expect(proxy3.catch(4, 5, 6)).toEqual({ args: [4, 5, 6] })
  })

  it('returns itself if awaited', async () => {
    const obj = { value: 42 }
    const proxy = preventNativeAwait(obj)
    expect(await proxy).toEqual(obj)

    const obj2 = { then: 323, catch: 123 }
    const proxy2 = preventNativeAwait(obj2)
    expect(await proxy2).toEqual(obj2)
    expect(await proxy2).toEqual(obj2)

    const obj3 = { then: (...args: any[]) => ({ args }), catch: (...args: any[]) => ({ args }) }
    const proxy3 = preventNativeAwait(obj3)
    const result3 = await (proxy3 as any)
    expect(result3.then(1, 2, 3)).toEqual({ args: [1, 2, 3] })
    expect(result3.catch(3, 4, 5)).toEqual({ args: [3, 4, 5] })
  })

  it('returns itself if multiple awaited times', async () => {
    const obj = { value: 42 }
    const proxy = preventNativeAwait(obj)
    const result = await (proxy as any)
    expect(result).toEqual(obj)
    await new Promise(resolve => setTimeout(resolve, 1))
    expect(await proxy).toEqual(obj)

    const obj2 = { then: 323, catch: 123 }
    const proxy2 = preventNativeAwait(obj2)
    const result2 = await (proxy2 as any)
    expect(result2).toEqual(obj2)
    await new Promise(resolve => setTimeout(resolve, 1))
    expect(await proxy2).toEqual(obj2)

    const obj3 = { then: (...args: any[]) => ({ args }), catch: (...args: any[]) => ({ args }) }
    const proxy3 = preventNativeAwait(obj3)
    const result3 = await (proxy3 as any)
    expect(result3.then(1, 2, 3)).toEqual({ args: [1, 2, 3] })
    expect(result3.catch(4, 5, 6)).toEqual({ args: [4, 5, 6] })
    await new Promise(resolve => setTimeout(resolve, 1))
    const result3_2 = await (proxy3 as any)
    expect(result3_2.then(1, 2, 3)).toEqual({ args: [1, 2, 3] })
    expect(result3_2.catch(4, 5, 6)).toEqual({ args: [4, 5, 6] })
  })

  it('returns itself if nested awaited times', async () => {
    const obj = { value: 42 }
    const proxy = preventNativeAwait(obj)
    const result = await (proxy as any)
    expect(result).toEqual(obj)
    await new Promise(resolve => setTimeout(resolve, 1))
    expect(await result).toEqual(obj)

    const obj2 = { then: 323, catch: 123 }
    const proxy2 = preventNativeAwait(obj2)
    const result2 = await (proxy2 as any)
    expect(result2).toEqual(obj2)
    await new Promise(resolve => setTimeout(resolve, 1))
    expect(await result2).toEqual(obj2)

    const obj3 = { then: (...args: any[]) => ({ args }), catch: (...args: any[]) => ({ args }) }
    const proxy3 = preventNativeAwait(obj3)
    const result3 = await (proxy3 as any)
    expect(result3.then(1, 2, 3)).toEqual({ args: [1, 2, 3] })
    expect(result3.catch(4, 5, 6)).toEqual({ args: [4, 5, 6] })
    await new Promise(resolve => setTimeout(resolve, 1))
    const result3_2 = await (result3 as any)
    expect(result3_2.then(1, 2, 3)).toEqual({ args: [1, 2, 3] })
    expect(result3_2.catch(4, 5, 6)).toEqual({ args: [4, 5, 6] })
  })
})
