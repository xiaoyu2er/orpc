import { describe, expect, it } from 'vitest'
import { ContractRoute } from './route'

describe('prefix method', () => {
  const r1 = new ContractRoute({
    method: 'GET',
    path: '/',
  })

  const r2 = new ContractRoute({
    method: 'GET',
    path: '/abc//',
  })

  it('works', () => {
    expect(r1.prefix('/prefix').__cr.path).toBe('/prefix')
    expect(r1.prefix('/prefix/').__cr.path).toBe('/prefix')
    expect(r1.prefix('/prefix/a').__cr.path).toBe('/prefix/a')
  })

  it('standardize path', () => {
    expect(r2.prefix('//prefix').__cr.path).toBe('/prefix/abc')
    expect(r2.prefix('/prefix/').__cr.path).toBe('/prefix/abc')
    expect(r2.prefix('/prefix//a').__cr.path).toBe('/prefix/a/abc')
  })

  it('create new instance', () => {
    expect(r1.prefix('/prefix')).not.toBe(r1)
  })

  it('bypass undefined routes', () => {
    const r3 = new ContractRoute({})

    expect(r3.prefix('/prefix')).toBe(r3)
    expect(r3.prefix('/prefix').__cr.path).toBe(undefined)
  })
})
