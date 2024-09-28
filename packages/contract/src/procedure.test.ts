import { describe, expect, it } from 'vitest'
import { ContractProcedure } from './procedure'

describe('prefix method', () => {
  const r1 = new ContractProcedure({
    method: 'GET',
    path: '/',
  })

  const r2 = new ContractProcedure({
    method: 'GET',
    path: '/abc//',
  })

  it('works', () => {
    expect(r1.prefix('/prefix').__cp.path).toBe('/prefix')
    expect(r1.prefix('/prefix/').__cp.path).toBe('/prefix')
    expect(r1.prefix('/prefix/a').__cp.path).toBe('/prefix/a')
  })

  it('standardize path', () => {
    expect(r2.prefix('//prefix').__cp.path).toBe('/prefix/abc')
    expect(r2.prefix('/prefix/').__cp.path).toBe('/prefix/abc')
    expect(r2.prefix('/prefix//a').__cp.path).toBe('/prefix/a/abc')
  })

  it('create new instance', () => {
    expect(r1.prefix('/prefix')).not.toBe(r1)
  })

  it('bypass undefined routes', () => {
    const r3 = new ContractProcedure({})

    expect(r3.prefix('/prefix').__cp.path).toBe(undefined)
  })
})
