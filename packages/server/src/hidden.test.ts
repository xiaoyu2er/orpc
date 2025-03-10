import { oc } from '@orpc/contract'
import { getRouterContract, setRouterContract } from './hidden'

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
