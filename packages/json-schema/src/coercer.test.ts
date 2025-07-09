/* eslint-disable prefer-regex-literals */
import { experimental_JsonSchemaCoercer as JsonSchemaCoercer } from './coercer'

describe('jsonSchemaCoercer', () => {
  const coercer = new JsonSchemaCoercer()

  it('can coerce primitive types', () => {
    expect(coercer.coerce({ type: 'boolean' }, 'true')).toEqual(true)
    expect(coercer.coerce({ type: 'boolean' }, 'false')).toEqual(false)
    expect(coercer.coerce({ type: 'boolean' }, 'invalid')).toEqual('invalid')

    expect(coercer.coerce({ type: 'number' }, '123')).toEqual(123)
    expect(coercer.coerce({ type: 'number' }, 'invalid')).toEqual(Number.NaN)

    // -- no coercion
    expect(coercer.coerce({ type: 'null' }, null)).toEqual(null)
    expect(coercer.coerce({ type: 'number' }, undefined)).toEqual(undefined)
    expect(coercer.coerce({ type: 'boolean' }, undefined)).toEqual(undefined)
  })

  it('can coerce multiple types', () => {
    // TODO
    // expect(coercer.coerce({ type: ['boolean', 'null'] }, 'true')).toEqual(true)
    expect(coercer.coerce({ type: ['number', 'boolean'] }, '123')).toEqual(123)
  })

  it('can coerce native types', () => {
    const date = new Date()
    expect(coercer.coerce({ 'type': 'string', 'x-native-type': 'date' } as any, date.toISOString())).toEqual(date)
    expect(coercer.coerce({ 'type': 'string', 'x-native-type': 'date' } as any, '1972-01-01')).toEqual(new Date('1972-01-01'))
    expect(coercer.coerce({ 'type': 'string', 'x-native-type': 'date' } as any, 'Invalid Date')).toEqual(new Date('Invalid Date'))

    expect(coercer.coerce({ 'type': 'string', 'x-native-type': 'bigint' } as any, '123')).toEqual(123n)
    expect(coercer.coerce({ 'type': 'string', 'x-native-type': 'bigint' } as any, 'invalid')).toEqual('invalid')

    expect(coercer.coerce({ 'type': 'string', 'x-native-type': 'url' } as any, 'https://example.com')).toEqual(new URL('https://example.com'))
    expect(coercer.coerce({ 'type': 'string', 'x-native-type': 'url' } as any, 'invalid')).toEqual('invalid')

    expect(coercer.coerce({ 'type': 'string', 'x-native-type': 'regexp' } as any, '/abc/i')).toEqual(new RegExp('abc', 'i'))
    expect(coercer.coerce({ 'type': 'string', 'x-native-type': 'regexp' } as any, '/abc/invalid')).toEqual('/abc/invalid')
    expect(coercer.coerce({ 'type': 'string', 'x-native-type': 'regexp' } as any, 'invalid')).toEqual('invalid')

    expect(coercer.coerce(
      { 'type': 'array', 'items': { type: 'number' }, 'x-native-type': 'set' } as any,
      ['1', '2', '3', '4'],
    )).toEqual(new Set([1, 2, 3, 4]))

    expect(coercer.coerce(
      { 'type': 'array', 'items': { type: 'array', prefixItems: [{ type: 'number' }, { type: 'boolean' }] }, 'x-native-type': 'map' } as any,
      [['1', 'true'], ['2', 'false'], ['invalid', 'invalid']],
    )).toEqual(new Map([[1, true], [2, false], [Number.NaN, 'invalid']] as any))

    expect(coercer.coerce(
      { 'type': 'array', 'items': { type: 'array', prefixItems: [{ type: 'number' }, { type: 'boolean' }] }, 'x-native-type': 'map' } as any,
      ['1'],
    )).toEqual(['1'])
  })

  it('can coerce complex structures', () => {
    const schema = {
      type: 'object',
      properties: {
        a: { type: 'boolean' },
        b: { type: 'number' },
        c: {
          type: 'array',
          items: { 'type': 'string', 'x-native-type': 'date' },
        },
        d: {
          type: 'object',
          properties: {
            e: {
              'type': 'array',
              'items': { 'type': 'string', 'x-native-type': 'url' },
              'x-native-type': 'set',
            },
          },
        },
      },
      required: ['a'],
    }

    expect(coercer.coerce(schema, {
      a: 'true',
      b: '123',
      c: ['2020-01-01', '2020-01-02'],
      d: {
        e: ['https://example.com', 'https://example.org'],
      },
    })).toEqual({
      a: true,
      b: 123,
      c: [new Date('2020-01-01'), new Date('2020-01-02')],
      d: {
        e: new Set([new URL('https://example.com'), new URL('https://example.org')]),
      },
    })
  })

  it('can handle union types', () => {
    const schema = {
      anyOf: [
        { type: 'number' },
        { type: 'boolean' },
        { type: 'object', properties: { a: { type: 'number' } } },
        { type: 'object', properties: { a: { type: 'number' }, b: { type: 'number' } } },
      ],
    } as any

    expect(coercer.coerce(schema, '123')).toEqual(123)
    // TODO
    //   expect(coercer.coerce(schema, 'true')).toEqual(true)
    expect(coercer.coerce(schema, { a: '123' })).toEqual({ a: 123 })
    // TODO
    // expect(coercer.coerce(schema, { a: '123', b: '456' })).toEqual({ a: 123, b: 456 })
  })

  it('can handle discriminated union types', () => {
    const schema = {
      anyOf: [
        { type: 'object', properties: { t: { const: 1 }, v: { type: 'number' } } },
        { type: 'object', properties: { t: { const: 2 }, v: { 'type': 'string', 'x-native-type': 'bigint' } } },
      ],
    } as any

    expect(coercer.coerce(schema, { t: '1', v: '123' })).toEqual({ t: 1, v: 123 })
    expect(coercer.coerce(schema, { t: '2', v: '123' })).toEqual({ t: 2, v: 123n })
  })

  it('can coerce intersection types', () => {
    const schema = {
      allOf: [
        { type: 'object', properties: { a: { type: 'number' } } },
        { type: 'object', properties: { b: { type: 'number' } } },
      ],
    } as any

    expect(coercer.coerce(schema, { a: '123', b: '456', c: '789' })).toEqual({ a: 123, b: 456, c: '789' })
    expect(coercer.coerce(schema, { a: '123' })).toEqual({ a: 123 })
    expect(coercer.coerce(schema, { b: '456' })).toEqual({ b: 456 })
  })

  it('can coerce recursive types', () => {
    const schema = {
      type: 'object',
      properties: {
        a: { type: 'boolean' },
        b: {
          anyOf: [
            { 'type': 'string', 'x-native-type': 'url' },
            { $ref: '#/components/schema/Test' },
          ],
        },
      },
    } as any

    expect(coercer.coerce(schema, {
      a: 'true',
      b: {
        a: 'off',
        b: {
          a: 'invalid',
          b: 'https://example.com',
        },
      },
    }, {
      components: {
        '#/components/schema/Test': schema,
      },
    })).toEqual({
      a: true,
      b: {
        a: false,
        b: {
          a: 'invalid',
          b: new URL('https://example.com'),
        },
      },
    })
  })
})
