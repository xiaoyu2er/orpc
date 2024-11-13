import { z } from 'zod'
import { isContractProcedure, oc } from '.'
import type { DecoratedContractProcedure } from './procedure'

test('prefix method', () => {
  const os = oc
  const p1 = os.route({
    method: 'GET',
    path: '/ping',
  })
  const p2 = os.input(z.object({}))

  expect(p1.prefix('/prefix').zz$cp.path).toEqual('/prefix/ping')
  expect(p2.prefix('/prefix').zz$cp.path).toEqual(undefined)

  expect(p1.prefix('/1').prefix('/2').zz$cp.path).toEqual('/2/1/ping')
  expect(p2.prefix('/1').prefix('/2').zz$cp.path).toEqual(undefined)
})

test('route method', () => {
  const p = oc
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
  const p = oc.route({}).input(schema)

  expectTypeOf(p).toEqualTypeOf<
    DecoratedContractProcedure<typeof schema, undefined>
  >()

  expect(p.zz$cp).toMatchObject({
    InputSchema: schema,
    inputExample: undefined,
  })
})

test('output method', () => {
  const schema = z.string()
  const p = oc.route({}).output(schema)

  expectTypeOf(p).toEqualTypeOf<
    DecoratedContractProcedure<undefined, typeof schema>
  >()

  expect(p.zz$cp).toMatchObject({
    OutputSchema: schema,
    outputExample: undefined,
  })
})

it('addTags method', () => {
  const schema = z.string()
  const p = oc.route({}).output(schema)

  expect(p.zz$cp.tags).toBe(undefined)

  const p2 = p.addTags('foo', 'bar')

  expect(p2.zz$cp.tags).toEqual(['foo', 'bar'])

  const p3 = p2.addTags('baz')

  expect(p3.zz$cp.tags).toEqual(['foo', 'bar', 'baz'])
})

test('isContractProcedure function', () => {
  expect(isContractProcedure(oc)).toBe(false)
  expect(isContractProcedure(oc.router({}))).toBe(false)
  expect(isContractProcedure(oc.route({}))).toBe(true)

  expect(isContractProcedure(oc.router({ prefix: oc.route({}) }).prefix)).toBe(
    true,
  )
})
