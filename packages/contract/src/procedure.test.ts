import { z } from 'zod'
import { initORPCContract, isContractProcedure } from '.'
import type { DecoratedContractProcedure } from './procedure'

test('prefix method', () => {
  const orpc = initORPCContract
  const p1 = orpc.route({
    method: 'GET',
    path: '/ping',
  })
  const p2 = orpc.input(z.object({}))

  expect(p1.prefix('/prefix').zz$cp.path).toEqual('/prefix/ping')
  expect(p2.prefix('/prefix').zz$cp.path).toEqual(undefined)

  expect(p1.prefix('/1').prefix('/2').zz$cp.path).toEqual('/2/1/ping')
  expect(p2.prefix('/1').prefix('/2').zz$cp.path).toEqual(undefined)
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
      tags: ['user'],
    })

  expectTypeOf(p).toEqualTypeOf<
    DecoratedContractProcedure<undefined, undefined>
  >()

  expect(p.zz$cp).toMatchObject({
    method: 'GET',
    path: '/abc',
    deprecated: true,
    description: 'abc',
    summary: 'abc',
    tags: ['user'],
  })
})

test('input method', () => {
  const schema = z.string()
  const p = initORPCContract.route({}).input(schema)

  expectTypeOf(p).toEqualTypeOf<
    DecoratedContractProcedure<typeof schema, undefined>
  >()

  expect(p.zz$cp).toMatchObject({
    InputSchema: schema,
    inputExample: undefined,
    inputExamples: undefined,
  })
})

test('output method', () => {
  const schema = z.string()
  const p = initORPCContract.route({}).output(schema)

  expectTypeOf(p).toEqualTypeOf<
    DecoratedContractProcedure<undefined, typeof schema>
  >()

  expect(p.zz$cp).toMatchObject({
    OutputSchema: schema,
    outputExample: undefined,
    outputExamples: undefined,
  })
})

it('addTags method', () => {
  const schema = z.string()
  const p = initORPCContract.route({}).output(schema)

  expect(p.zz$cp.tags).toBe(undefined)

  const p2 = p.addTags('foo', 'bar')

  expect(p2.zz$cp.tags).toEqual(['foo', 'bar'])

  const p3 = p2.addTags('baz')

  expect(p3.zz$cp.tags).toEqual(['foo', 'bar', 'baz'])
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
