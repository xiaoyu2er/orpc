import { describe, expect, it } from 'vitest'
import { ContractProcedure } from './procedure'
import { decorateContractRouter } from './router'

describe('prefix method', () => {
  const r1 = new ContractProcedure({
    method: 'GET',
    path: '/',
  })

  const r2 = new ContractProcedure({
    method: 'GET',
    path: '/abc//',
  })

  const router = decorateContractRouter({
    r1: r1,
    prefix: r2,
    nested: {
      prefix: r2,
    },
  })

  it('works (and standardize path)', () => {
    expect(router.prefix('/prefix').r1.__cp.path).toBe('/prefix')
    expect(router.prefix('/prefix/a').nested.prefix.__cp.path).toBe('/prefix/a/abc')
  })

  it('create new instance', () => {
    expect(router.prefix('/prefix')).not.toBe(router)
    expect(router.prefix('/prefix').r1).not.toBe(router.r1)
    expect(router.prefix('/prefix').prefix).not.toBe(router.prefix)
    expect(router.prefix('/prefix').nested.prefix).not.toBe(router.nested.prefix)
  })
})
