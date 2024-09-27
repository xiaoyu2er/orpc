import { describe, expect, it } from 'vitest'
import { ContractRoute } from './route'
import { createExtendedContractRouter } from './router'

describe('prefix method', () => {
  const r1 = new ContractRoute({
    method: 'GET',
    path: '/',
  })

  const r2 = new ContractRoute({
    method: 'GET',
    path: '/abc//',
  })

  const router = createExtendedContractRouter({
    r1: r1,
    prefix: r2,
    nested: {
      prefix: r2,
    },
  })

  it('works (and standardize path)', () => {
    expect(router.prefix('/prefix').r1.__cr.path).toBe('/prefix')
    expect(router.prefix('/prefix/a').nested.prefix.__cr.path).toBe('/prefix/a/abc')
  })

  it('create new instance', () => {
    expect(router.prefix('/prefix')).not.toBe(router)
    expect(router.prefix('/prefix').r1).not.toBe(router.r1)
    expect(router.prefix('/prefix').prefix).not.toBe(router.prefix)
    expect(router.prefix('/prefix').nested.prefix).not.toBe(router.nested.prefix)
  })
})
