import { deepSetLazyRouterPrefix, getLazyRouterPrefix } from './hidden'

describe('deepSetLazyRouterPrefix', () => {
  it('sets prefix on root object', () => {
    const obj = { value: 1 }
    const prefixed = deepSetLazyRouterPrefix(obj, '/api')
    expect(getLazyRouterPrefix(prefixed)).toBe('/api')
    expect(prefixed.value).toBe(1)
  })

  it('sets prefix on all nested objects', () => {
    const obj = {
      l1: {
        l2: {
          l3: { value: 42 },
        },
      },
    }
    const prefixed = deepSetLazyRouterPrefix(obj, '/api')
    expect(getLazyRouterPrefix(prefixed)).toBe('/api')
    expect(getLazyRouterPrefix(prefixed.l1)).toBe('/api')
    expect(getLazyRouterPrefix(prefixed.l1.l2)).toBe('/api')
    expect(getLazyRouterPrefix(prefixed.l1.l2.l3)).toBe('/api')
    expect(prefixed.l1.l2.l3.value).toBe(42)
  })

  it('handles functions in objects', () => {
    const obj = {
      fn: () => 42,
      nested: { fn: () => 43 },
    }
    const prefixed = deepSetLazyRouterPrefix(obj, '/api')
    expect(getLazyRouterPrefix(prefixed.fn)).toBe('/api')
    expect(getLazyRouterPrefix(prefixed.nested.fn)).toBe('/api')
    expect(prefixed.fn()).toBe(42)
    expect(prefixed.nested.fn()).toBe(43)
  })

  it('allows prefix override', () => {
    const obj = { value: 1 }
    const prefixed1 = deepSetLazyRouterPrefix(obj, '/api')
    const prefixed2 = deepSetLazyRouterPrefix(prefixed1, '/v2')

    expect(getLazyRouterPrefix(prefixed1)).toBe('/api')
    expect(getLazyRouterPrefix(prefixed2)).toBe('/v2')
    expect(prefixed2.value).toBe(1)
  })

  it('handles nested prefix override', () => {
    const obj = {
      l1: { value: 1 },
      l2: { value: 2 },
    }
    const prefixed1 = deepSetLazyRouterPrefix(obj, '/api')
    const prefixed2 = deepSetLazyRouterPrefix(prefixed1.l1, '/v2')

    expect(getLazyRouterPrefix(prefixed1)).toBe('/api')
    expect(getLazyRouterPrefix(prefixed1.l2)).toBe('/api')
    expect(getLazyRouterPrefix(prefixed2)).toBe('/v2')
    expect(prefixed2.value).toBe(1)
  })
})
