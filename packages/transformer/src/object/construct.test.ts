import { construct, parseKey } from './construct'

describe('parseKey', () => {
  it('works', () => {
    expect(parseKey('')).toEqual([''])
    expect(parseKey('a')).toEqual(['a'])
    expect(parseKey('a[b]')).toEqual(['a', 'b'])
    expect(parseKey('a[b][c]')).toEqual(['a', 'b', 'c'])
    expect(parseKey('a[b][c][d]')).toEqual(['a', 'b', 'c', 'd'])
    expect(parseKey('a[b][c][d][]')).toEqual(['a', 'b', 'c', 'd', ''])
    expect(parseKey('a[][b][c][d]')).toEqual(['a', '', 'b', 'c', 'd'])
  })
})

describe('construct', () => {
  it('works', () => {
    expect(construct([['', 'b']])).toEqual({ a: 'b' })
    expect(construct([['a', 'b']])).toEqual({ a: 'b' })
    expect(construct([['a[b]', 'c']])).toEqual({ a: { b: 'c' } })
    expect(construct([['a[b][c]', 'd']])).toEqual({ a: { b: { c: 'd' } } })
    expect(construct([['a[b][c][d]', 'e']])).toEqual({
      a: { b: { c: { d: 'e' } } },
    })

    expect(construct([['a[][b]', 'c']])).toEqual({ a: [{ b: 'c' }] })
    expect(construct([['a[][b][c]', 'd']])).toEqual({
      a: [{ b: { c: 'd' } }],
    })

    expect(
      construct([
        ['a[][b]', 'c'],
        ['a[][a]', 'c'],
        ['a[][b]', 'f'],
        ['a[][b]', 'f'],
      ]),
    ).toEqual({ a: [{ b: 'c', a: 'c' }, { b: 'f' }, { b: 'f' }] })

    expect(
      construct([
        ['a[][b]', 'c'],
        ['a[][b]', 'f'],
        ['a[][a]', 'c'],
        ['a[][b]', 'f'],
      ]),
    ).toEqual({ a: [{ b: 'c' }, { b: 'f', a: 'c' }, { b: 'f' }] })
  })

  it('array', () => {
    expect(construct([['a[]', 'b']])).toEqual({ a: ['b'] })
    expect(
      construct([
        ['a[0]', 'b'],
        ['a[1]', 'c'],
      ]),
    ).toEqual({ a: ['b', 'c'] })
  })
})
