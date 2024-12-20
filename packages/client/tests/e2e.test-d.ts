import { client } from './helpers'

describe('e2e', () => {
  it('infer input', () => {
    client.user.find({ id: '123' })
    // @ts-expect-error - invalid input
    client.user.find({ id: 123 })

    client.ping()
    client.ping('any_thing')

    client.nested.countFileSize({} as Blob)
    client.nested.countFileSize({} as File)
    // @ts-expect-error - invalid input
    client.nested.countFileSize({})
  })

  it('infer output', () => {
    expectTypeOf(client.ping()).toEqualTypeOf<Promise<string>>()
    expectTypeOf(client.user.find({ id: '123' })).toEqualTypeOf<Promise<{ id: string, name: string }>>()
  })

  it('works on error', () => {
    // @ts-expect-error - invalid input
    expect(client.user.find()).rejects.toThrowError(
      'Validation input failed',
    )
  })
})
