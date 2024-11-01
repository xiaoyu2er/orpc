import { describe, expect, it } from 'vitest'
import {
  deserialize,
  parsePath,
  serialize,
  stringifyPath,
} from './bracket-notation'

describe('stringifyPath', () => {
  it('should convert simple path segments to bracket notation', () => {
    expect(stringifyPath(['name'])).toBe('name')
    expect(stringifyPath(['name', 'pets', '0'])).toBe('name[pets][0]')
  })

  it('should handle empty path segments', () => {
    ;() => {
      // @ts-expect-error: empty segments are not allowed
      expect(stringifyPath([])).toBe('')
    }
    expect(stringifyPath(['', 'test'])).toBe('[test]')
  })

  it('should escape special characters', () => {
    expect(stringifyPath(['name[with]brackets'])).toBe('name\\[with\\]brackets')
    expect(stringifyPath(['[start]', 'middle', '[end]'])).toBe(
      '\\[start\\][middle][\\[end\\]]',
    )
    expect(stringifyPath(['user\\[', 'age'])).toBe('user\\\\\\[[age]')
    expect(stringifyPath(['user\\\\[', 'age'])).toBe('user\\\\\\\\\\[[age]')
    expect(stringifyPath(['user\\\\\\', 'age'])).toBe('user\\\\\\\\\\\\[age]')
  })
})

describe('parsePath', () => {
  it('should parse simple bracket notation paths', () => {
    expect(parsePath('name')).toEqual(['name'])
    expect(parsePath('name[pets][0]')).toEqual(['name', 'pets', '0'])
  })

  it('should handle incomplete bracket pairs', () => {
    expect(parsePath('name[pets[0]')).toEqual(['name', 'pets[0'])
    expect(parsePath('name[pets]0]')).toEqual(['name', 'pets', '0]'])
    expect(parsePath('name[pets][0')).toEqual(['name', 'pets', '[0'])
  })

  it('should handle escaped brackets', () => {
    expect(parsePath('name\\[pets][0]')).toEqual(['name[pets]', '0'])
    expect(parsePath('\\[name\\][test]')).toEqual(['[name]', 'test'])
    expect(parsePath('\\\\[name\\][test]')).toEqual(['\\', 'name][test'])
    expect(parsePath('\\\\\\[name\\][test]')).toEqual(['\\[name]', 'test'])
  })

  it('should handle empty segments', () => {
    expect(parsePath('')).toEqual([''])
    expect(parsePath('[]')).toEqual(['', ''])
    expect(parsePath('[user]')).toEqual(['', 'user'])
    expect(parsePath('[0]')).toEqual(['', '0'])
  })

  it('should handle special characters in segments', () => {
    expect(parsePath('path[with spaces][and.dots]')).toEqual([
      'path',
      'with spaces',
      'and.dots',
    ])
    expect(parsePath('path[with[nested]brackets]')).toEqual([
      'path',
      'with[nested',
      'brackets]',
    ])
  })
})

describe('stringifyPath & parsePath', () => {
  const segmentsArr = [
    ['user', 'name'],
    ['segments\\', 'with\\', 'escaped', 'characters'],
    ['empty', ''],
    [''],
    ['', '0'],
    ['', '123'],
    ['', '[1234]'],
    ['', ']xin '],
    ['', ']say hi'],
    ['\\', '\\]say hi'],
    ['\\', '\\\\]say hi'],
    ['\\', '\\\\\\\\\\]say hi'],
  ] as const

  it.each(segmentsArr)('should be reversible: %s', (...segments) => {
    expect(parsePath(stringifyPath(segments as any))).toEqual(segments)
  })
})

describe('serialize', () => {
  it('should serialize flat objects', () => {
    const input = { name: 'John', age: 30 }
    const expected = [
      ['name', 'John'],
      ['age', 30],
    ]
    expect(serialize(input)).toEqual(expected)
  })

  it('should serialize nested objects', () => {
    const input = {
      user: {
        name: 'John',
        address: {
          city: 'New York',
        },
      },
    }
    const expected = [
      ['user[name]', 'John'],
      ['user[address][city]', 'New York'],
    ]
    expect(serialize(input)).toEqual(expected)
  })

  it('should serialize arrays', () => {
    const input = ['a', 'b', 'c']
    const expected = [
      ['0', 'a'],
      ['1', 'b'],
      ['2', 'c'],
    ]
    expect(serialize(input)).toEqual(expected)

    const input2 = { '': ['a', 'b', 'c'] }
    const expected2 = [
      ['[0]', 'a'],
      ['[1]', 'b'],
      ['[2]', 'c'],
    ]
    expect(serialize(input2)).toEqual(expected2)
  })

  it('should serialize mixed nested structures', () => {
    const input = {
      name: 'John Doe',
      pets: ['dog', 'cat'],
      addresses: [
        { city: 'New York', type: 'home' },
        { city: 'Boston', type: 'work' },
      ],
    }
    const expected = [
      ['name', 'John Doe'],
      ['pets[0]', 'dog'],
      ['pets[1]', 'cat'],
      ['addresses[0][city]', 'New York'],
      ['addresses[0][type]', 'home'],
      ['addresses[1][city]', 'Boston'],
      ['addresses[1][type]', 'work'],
    ]
    expect(serialize(input)).toEqual(expected)
  })

  it('should handle empty objects and arrays', () => {
    expect(serialize({})).toEqual([])
    expect(serialize([])).toEqual([])
    expect(serialize({ empty: {} })).toEqual([])
    expect(serialize({ emptyArray: [] })).toEqual([])
  })

  it('should handle null and undefined values', () => {
    const input = {
      nullValue: null,
      undefinedValue: undefined,
      nested: {
        nullValue: null,
      },
    }
    const expected = [
      ['nullValue', null],
      ['undefinedValue', undefined],
      ['nested[nullValue]', null],
    ]
    expect(serialize(input)).toEqual(expected)
  })
})

describe('deserialize', () => {
  it('should deserialize flat key-value pairs', () => {
    const input = [
      ['name', 'John'],
      ['age', 30],
    ] as const
    const expected = {
      name: 'John',
      age: 30,
    }
    expect(deserialize(input)).toEqual(expected)
  })

  it('should deserialize nested objects', () => {
    const input = [
      ['user[name]', 'John'],
      ['user[address][city]', 'New York'],
    ] as const
    const expected = {
      user: {
        name: 'John',
        address: {
          city: 'New York',
        },
      },
    }
    expect(deserialize(input)).toEqual(expected)
  })

  it('should deserialize object with sequence number keys', () => {
    const input = [
      ['0', 'a'],
      ['1', 'b'],
      ['2', 'c'],
    ] as const
    const expected = { 0: 'a', 1: 'b', 2: 'c' }
    expect(deserialize(input)).toEqual(expected)
  })

  it('should deserialize arrays in push style', () => {
    const input = [
      ['names[]', 'John'],
      ['names[]', 'Jane'],
    ] as const
    const expected = {
      names: ['John', 'Jane'],
    }
    expect(deserialize(input)).toEqual(expected)
  })

  it('should handle mixed nested structures', () => {
    const input = [
      ['name', 'John Doe'],
      ['pets[]', 'dog'],
      ['pets[]', 'cat'],
      ['addresses[0][city]', 'New York'],
      ['addresses[0][type]', 'home'],
      ['addresses[1][city]', 'Boston'],
      ['addresses[1][type]', 'work'],
    ] as const
    const expected = {
      name: 'John Doe',
      pets: ['dog', 'cat'],
      addresses: {
        0: { city: 'New York', type: 'home' },
        1: { city: 'Boston', type: 'work' },
      },
    }
    expect(deserialize(input)).toEqual(expected)
  })

  it('should handle empty input', () => {
    expect(deserialize([])).toEqual({})
  })

  it('should handle duplicate keys by using the last value', () => {
    const input = [
      ['name', 'John'],
      ['name', 'Jane'],
    ] as const
    const expected = {
      name: 'Jane',
    }
    expect(deserialize(input)).toEqual(expected)
  })

  it('should handle escaped characters in keys', () => {
    const input = [
      ['key\\[with\\]bracket.s', 'value'],
      ['key[va]lu.e]', 'value'],
    ] as const
    const expected = {
      'key[with]bracket.s': 'value',
      key: {
        va: {
          'lu.e]': 'value',
        },
      },
    }
    expect(deserialize(input)).toEqual(expected)
  })

  it('should deserialize object when both [], and [0] appear', () => {
    const input = [
      ['names[]', 'John'],
      ['names[0]', 'Jane'],
    ] as const
    const expected = {
      names: {
        '': 'John',
        '0': 'Jane',
      },
    }
    expect(deserialize(input)).toEqual(expected)
  })

  it('should deserialize object when both [], and [1] appear', () => {
    const input = [
      ['names[]', 'John'],
      ['names[1]', 'Jane'],
    ] as const
    const expected = {
      names: {
        '': 'John',
        '1': 'Jane',
      },
    }
    expect(deserialize(input)).toEqual(expected)
  })

  it('should deserialize object when both [], and [any_string] appear', () => {
    const input = [
      ['names[age]', 'string'],
      ['names[]', 'empty'],
    ] as const
    const expected = {
      names: {
        '': 'empty',
        age: 'string',
      },
    }
    expect(deserialize(input)).toEqual(expected)
  })

  it('should deserialize array when only one [] appear', () => {
    const input = [['name[]', 'onlyValue']] as const
    const expected = { name: ['onlyValue'] }
    expect(deserialize(input)).toEqual(expected)
  })

  it('should handle the case multiple [] appear with a different index', () => {
    const input = [
      ['names[]', 'John'],
      ['names[]', 'John2'],
      ['names[]', 'John3'],
      ['names[index]', 'Jane'],
    ] as const
    const expected = {
      names: {
        '': 'John3',
        index: 'Jane',
      },
    }
    expect(deserialize(input)).toEqual(expected)
  })

  it('should deserialize a root array', () => {
    const input = [
      ['', '1'],
      ['', '2'],
    ] as const
    const expected = ['1', '2']
    expect(deserialize(input)).toEqual(expected)
  })

  it('should deserialize a root array', () => {
    const input = [
      ['[]', '1'],
      ['[]', '2'],
    ] as const
    const expected = { '': ['1', '2'] }
    expect(deserialize(input)).toEqual(expected)
  })

  it('should return undefined when there are no entities', () => {
    const input = [] as const
    const expected = undefined
    expect(deserialize(input)).toEqual(expected)
  })
})
