import * as SuperJSON from './super-json'

enum Test {
  A = 1,
  B = 2,
  C = 'C',
  D = 'D',
}

const types = [
  ['enum'],
  [Test.B],
  [Test.D],
  ['string'],
  ['string'],
  [1234],
  [1234],
  [Number.NaN],
  [true],
  [true],
  [false],
  [false],
  [null],
  [null],
  [undefined],
  [undefined],
  [new Date('2023-01-01')],
  [new Date('Invalid')],
  [new Date('Invalid')],
  [BigInt(1234)],
  [BigInt(1234)],
  [/uic/gi],
  [/npa|npb/gi],
  [/npa|npb/],
  [new URL('https://unnoq.com')],
  [
    { a: 1, b: 2, c: 3 },
  ],
  [[1, 2, 3]],
  [
    new Map([
      [1, 2],
      [3, 4],
    ]),
  ],
  [
    { a: [1, 2, 3], b: new Set([1, 2, 3]) },
  ],
  [
    new Map([
      [1, 2],
      [3, 4],
    ]),
  ],
  [
    new File(['"name"'], 'file.json', {
      type: 'application/json',
    }),
  ],
  [
    new File(['content of file'], 'file.txt', {
      type: 'application/octet-stream',
    }),
  ],
  [
    new File(['content of file 2'], 'file.pdf', { type: 'application/pdf' }),
  ],
] as const

describe('super json', () => {
  it.each(types)('should work on flat: %s', async (origin) => {
    expect(
      SuperJSON.deserialize(SuperJSON.serialize(origin)),
    )
      .toEqual(origin)
  })

  it.each(types)(
    'should work on nested object: %s',
    async (origin) => {
      const object = {
        data: origin,
      }

      expect(
        SuperJSON.deserialize(SuperJSON.serialize(object)),
      )
        .toEqual(object)
    },
  )

  it.each(types)(
    'should work on complex object: %s',
    async (origin) => {
      const object = {
        '[]data\\]': origin,
        'list': [origin],
        'map': new Map([[origin, origin]]),
        'set': new Set([origin]),
      }
      expect(
        SuperJSON.deserialize(SuperJSON.serialize(object)),
      )
        .toEqual(object)
    },
  )
})
