import { oc } from '@orpc/contract'
import { deepSetLazyRouterPrefix, getLazyRouterPrefix, getRouterContract, setRouterContract } from './hidden'

describe('setRouterContract', () => {
  const ping = oc.route({})
  const baseContract = { ping }
  const nestedContract = { ping, nested: { ping } }

  it('sets contract on empty object', () => {
    const obj = {}
    const router = setRouterContract(obj, baseContract)
    expect(getRouterContract(router)).toBe(baseContract)
  })

  it('preserves original object properties', () => {
    const obj = { existingProp: 'value' }
    const router = setRouterContract(obj, baseContract)
    expect(router.existingProp).toBe('value')
    expect(getRouterContract(router)).toBe(baseContract)
  })

  it('handles nested contracts', () => {
    const obj = { nested: { value: 42 } }
    const router = setRouterContract(obj, nestedContract)
    expect(getRouterContract(router)).toBe(nestedContract)
    expect(router.nested.value).toBe(42)
    expect(getRouterContract(router.nested)).toBeUndefined()
  })

  it('allows contract overwriting', () => {
    const obj = {}
    const router1 = setRouterContract(obj, baseContract)
    const router2 = setRouterContract(router1, nestedContract)
    expect(getRouterContract(router2)).toBe(nestedContract)
  })
})

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
