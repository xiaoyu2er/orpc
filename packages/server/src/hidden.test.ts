import { oc } from '@orpc/contract'
import { router } from '../tests/shared'
import { deepSetLazyRouterPrefix, getLazyRouterPrefix, getRouterContract, setRouterContract } from './hidden'
import { lazy, unlazy } from './lazy'
import { createAccessibleLazyRouter } from './router-accessible-lazy'

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
    const obj = { existingProp: 'value' } as any
    const router = setRouterContract(obj, baseContract)
    expect(router.existingProp).toBe('value')
    expect(getRouterContract(router)).toBe(baseContract)
  })

  it('handles nested contracts', () => {
    const obj = { nested: { value: 42 } } as any
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
  it('prefix on root and nested lazy', async () => {
    const obj = createAccessibleLazyRouter(lazy(() => Promise.resolve({
      default: {
        l1: {
          l2: {
            l3: { value: router.ping },
          },
        },
      },
    })))
    const prefixed = deepSetLazyRouterPrefix(obj, '/api')
    expect(getLazyRouterPrefix(prefixed)).toBe('/api')
    expect(getLazyRouterPrefix(prefixed.l1)).toBe('/api')
    expect(getLazyRouterPrefix(prefixed.l1.l2)).toBe('/api')
    expect(getLazyRouterPrefix(prefixed.l1.l2.l3)).toBe('/api')
    expect(getLazyRouterPrefix(prefixed.l1.l2.l3.value)).toBe('/api')
    expect(await unlazy(prefixed.l1.l2.l3.value)).toEqual(await unlazy(router.ping))
  })

  it('can override old prefix', async () => {
    const obj = createAccessibleLazyRouter(lazy(() => Promise.resolve({
      default: {
        l1: {
          l2: {
            l3: { value: router.ping },
          },
        },
      },
    })))

    const prefixed1 = deepSetLazyRouterPrefix(obj, '/api')
    const prefixed2 = deepSetLazyRouterPrefix(prefixed1, '/v2')

    expect(getLazyRouterPrefix(prefixed1)).toBe('/api')
    expect(getLazyRouterPrefix(prefixed1.l1.l2.l3.value)).toBe('/api')
    expect(getLazyRouterPrefix(prefixed2)).toBe('/v2')
    expect(getLazyRouterPrefix(prefixed2.l1.l2.l3.value)).toBe('/v2')

    expect(await unlazy(obj)).toEqual(await unlazy(obj))
  })

  it('not prefix on non-lazy', () => {
    const obj = {
      l1: {
        l2: {
          l3: { value: router.ping },
          value: 1, // not lazy
        },
      },
    } as any

    const prefixed = deepSetLazyRouterPrefix(obj, '/api') as any

    expect(getLazyRouterPrefix(prefixed)).toBe('/api')
    expect(getLazyRouterPrefix(prefixed.l1)).toBe(undefined)
    expect(getLazyRouterPrefix(prefixed.l1.l2.value)).toBe(undefined)
  })
})
