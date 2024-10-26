import { crush } from './crush'

describe('crush', () => {
  it('should handle empty objects and arrays', () => {
    expect(crush({ a: {} })).toEqual({ a: {} })
    expect(crush({ a: [] })).toEqual({ a: [] })
  })

  it('should handle basic key-value pairs', () => {
    expect(crush({ a: 'b' })).toEqual({ a: 'b' })
    expect(crush({ key: 123 })).toEqual({ key: 123 })
  })

  it('should handle nested objects', () => {
    expect(crush({ a: { b: 'c' } })).toEqual({ 'a[b]': 'c' })
    expect(crush({ x: { y: { z: 'val' } } })).toEqual({ 'x[y][z]': 'val' })
  })

  it('should handle arrays with numeric indices', () => {
    expect(crush({ arr: [1, 2] })).toEqual({
      'arr[0]': 1,
      'arr[1]': 2,
    })
  })

  it('should handle objects within arrays', () => {
    expect(crush({ a: [{ b: 'c' }] })).toEqual({ 'a[0][b]': 'c' })
  })

  it('should handle multiple properties in array objects', () => {
    expect(crush({ a: [{ b: 'c', d: 'e' }] })).toEqual({
      'a[0][b]': 'c',
      'a[0][d]': 'e',
    })
  })

  it('should handle multiple objects in arrays', () => {
    expect(
      crush({
        a: [{ b: 'c', a: 'c' }, { b: 'f' }],
      }),
    ).toEqual({
      'a[0][b]': 'c',
      'a[0][a]': 'c',
      'a[1][b]': 'f',
    })
  })

  it('should handle deep nested arrays and objects', () => {
    expect(
      crush({
        users: [
          {
            name: 'John',
            age: 25,
            hobbies: ['reading', 'gaming'],
          },
          {
            name: 'Jane',
            age: 30,
            hobbies: ['swimming'],
          },
        ],
      }),
    ).toEqual({
      'users[0][name]': 'John',
      'users[0][age]': 25,
      'users[0][hobbies][0]': 'reading',
      'users[0][hobbies][1]': 'gaming',
      'users[1][name]': 'Jane',
      'users[1][age]': 30,
      'users[1][hobbies][0]': 'swimming',
    })
  })

  it('should handle null and undefined values', () => {
    expect(
      crush({
        a: {
          b: null,
          c: undefined,
        },
      }),
    ).toEqual({
      'a[b]': null,
      'a[c]': undefined,
    })
  })

  it('should handle number keys in objects', () => {
    expect(
      crush({
        items: {
          1: 'first',
          2: 'second',
        },
      }),
    ).toEqual({
      'items[1]': 'first',
      'items[2]': 'second',
    })
  })

  it('should handle root-level arrays', () => {
    expect(crush([{ a: 1 }, 2, 3])).toEqual({
      '[0][a]': 1,
      '[1]': 2,
      '[2]': 3,
    })
  })

  it('should handle sets and maps', () => {
    expect(crush({ a: new Set([1, 2, 3]) })).toEqual({
      'a[0]': 1,
      'a[1]': 2,
      'a[2]': 3,
    })

    expect(
      crush({
        a: new Map([
          ['a', 1],
          ['b', 2],
        ]),
      }),
    ).toEqual({
      'a[0][0]': 'a',
      'a[0][1]': 1,
      'a[1][0]': 'b',
      'a[1][1]': 2,
    })
  })
})
