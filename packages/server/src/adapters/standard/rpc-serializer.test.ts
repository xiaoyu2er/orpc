import { RPCSerializer } from './rpc-serializer'

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
  [false],
  [null],
  [undefined],
  [new Date('2023-01-01')],
  [new Date('Invalid')],
  [BigInt(1234)],
  [/npa|npb/],
  [/uic/gi],
  [new URL('https://unnoq.com')],
  [{ a: 1, b: 2, c: 3 }],
  [[1, 2, 3]],
  [new Map([[1, 2], [3, 4]])],
  [{ a: [1, 2, 3], b: new Set([1, 2, 3]) }],
  [new Map([[1, 2], [3, 4]])],
  [new Blob(['blob'], { type: 'text/plain' })],
  [new File(['"name"'], 'file.json', { type: 'application/json' })],
  [new File(['content of file'], 'file.txt', { type: 'application/octet-stream' })],
] as const

describe.each(types)('rpcSerializer: %s', (origin) => {
  const serializer = new RPCSerializer()

  const expected = origin instanceof Blob
    ? expect.toSatisfy((value: any) => {
        expect(value).toBeInstanceOf(Blob)
        expect(value.type).toEqual(origin.type)
        expect(value.size).toEqual(origin.size)

        if (origin instanceof File) {
          expect(value.name).toEqual(origin.name)
        }

        return true
      })
    : origin

  it('should work on flat', async () => {
    expect(
      serializer.deserialize(serializer.serialize(origin)),
    ).toEqual(
      expected,
    )
  })

  it('should work on nested object', async () => {
    const object = {
      data: origin,
    }

    expect(
      serializer.deserialize(serializer.serialize(object)),
    )
      .toEqual(
        {
          data: expected,
        },
      )
  })

  it('should work on complex object', async () => {
    const object = {
      '[]data\\]': origin,
      'list': [origin],
      'map': new Map([[origin, origin]]),
      'set': new Set([origin]),
    }

    expect(
      serializer.deserialize(serializer.serialize(object)),
    )
      .toEqual({
        '[]data\\]': expected,
        'list': [expected],
        'map': new Map([[expected, expected]]),
        'set': new Set([expected]),
      })
  })
})
