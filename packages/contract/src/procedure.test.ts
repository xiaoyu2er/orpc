import { z } from 'zod'
import { initORPCContract, isContractProcedure } from '.'
import type { ContractProcedure } from './procedure'

describe('prefix method', () => {
  const orpc = initORPCContract

  const procedure1 = orpc.route({
    method: 'GET',
    path: '/',
  })

  const procedure2 = orpc.route({
    method: 'GET',
    path: '/abc//',
  })

  it('should prefix and standardize path', () => {
    const p1 = procedure1.prefix('/')
    const p2 = procedure1.prefix('/prefix/')
    const p3 = procedure1.prefix('/prefix/a')

    expect(p1.zzContractProcedure.path).toBe('/')
    expect(p2.zzContractProcedure.path).toBe('/prefix')
    expect(p3.zzContractProcedure.path).toBe('/prefix/a')
  })

  it('should standardize path', () => {
    const p1 = procedure2.prefix('//prefix')
    const p2 = procedure2.prefix('/prefix/')
    const p3 = procedure2.prefix('/prefix//a')

    expect(p1.zzContractProcedure.path).toBe('/prefix/abc')
    expect(p2.zzContractProcedure.path).toBe('/prefix/abc')
    expect(p3.zzContractProcedure.path).toBe('/prefix/a/abc')
  })

  it('should create new instance', () => {
    expect(procedure1.prefix('/prefix')).not.toBe(procedure1)
  })

  it('should bypass undefined routes', () => {
    const p = orpc.route({}).prefix('/prefix')

    expect(p.zzContractProcedure.path).toBe(undefined)
  })
})

test('route method', () => {
  const p = initORPCContract
    .route({
      method: 'POST',
    })
    .route({
      method: 'GET',
      path: '/abc',
      deprecated: true,
      description: 'abc',
      summary: 'abc',
    })

  expectTypeOf(p).toEqualTypeOf<ContractProcedure<undefined, undefined>>()

  expect(p.zzContractProcedure).toMatchObject({
    method: 'GET',
    path: '/abc',
    deprecated: true,
    description: 'abc',
    summary: 'abc',
  })
})

test('description method', () => {
  const p = initORPCContract.route({}).description('abc')

  expect(p.zzContractProcedure).toMatchObject({
    description: 'abc',
  })
})

test('summary method', () => {
  const p = initORPCContract.route({}).summary('abc')

  expect(p.zzContractProcedure).toMatchObject({
    summary: 'abc',
  })
})

test('deprecated method', () => {
  const p = initORPCContract.route({}).deprecated()

  expect(p.zzContractProcedure).toMatchObject({
    deprecated: true,
  })
})

test('input method', () => {
  const schema = z.string()
  const p = initORPCContract.route({}).input(schema)

  expectTypeOf(p).toEqualTypeOf<ContractProcedure<typeof schema, undefined>>()

  expect(p.zzContractProcedure).toMatchObject({
    InputSchema: schema,
    inputExample: undefined,
    inputExamples: undefined,
  })
})

test('output method', () => {
  const schema = z.string()
  const p = initORPCContract.route({}).output(schema)

  expectTypeOf(p).toEqualTypeOf<ContractProcedure<undefined, typeof schema>>()

  expect(p.zzContractProcedure).toMatchObject({
    OutputSchema: schema,
    outputExample: undefined,
    outputExamples: undefined,
  })
})

test('isContractProcedure function', () => {
  const orpc = initORPCContract

  expect(isContractProcedure(orpc)).toBe(false)
  expect(isContractProcedure(orpc.router({}))).toBe(false)
  expect(isContractProcedure(orpc.route({}))).toBe(true)

  expect(
    isContractProcedure(orpc.router({ prefix: orpc.route({}) }).prefix),
  ).toBe(true)
})
