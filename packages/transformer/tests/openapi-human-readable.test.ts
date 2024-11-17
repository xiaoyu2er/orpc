import { z } from 'zod'
import { OpenAPIDeserializer, OpenAPISerializer } from '../src'

describe('OpenAPI transformer human readable', () => {
  it('should deserialize object', async () => {
    const form = new FormData()
    form.append('number', '123')
    form.append('user[name]', 'unnoq')
    form.append('user[age]', '18')
    form.append('user[gender]', 'male')

    const schema = z.object({
      number: z.number(),
      user: z.object({
        name: z.string(),
        age: z.number(),
        gender: z.enum(['male', 'female']),
      }),
    })

    const deserializer = new OpenAPIDeserializer({ schema })

    expect(
      await deserializer.deserialize(
        new Request('http://localhost', {
          method: 'POST',
          body: form,
        }),
      ),
    ).toEqual({
      number: 123,
      user: {
        name: 'unnoq',
        age: 18,
        gender: 'male',
      },
    })
  })

  it('should deserialize array', async () => {
    const form = new FormData()
    form.append('a1[0]', '10')
    form.append('a1[1]', '20')
    form.append('a1[2]', '30')
    form.append('a2[]', '1998-01-01')
    form.append('a2[]', '1999-01-01')
    form.append('a2[]', '2000-01-01')

    const schema = z.object({
      a1: z.array(z.number()),
      a2: z.array(z.date()),
    })

    const deserializer = new OpenAPIDeserializer({ schema })

    expect(
      await deserializer.deserialize(
        new Request('http://localhost', {
          method: 'POST',
          body: form,
        }),
      ),
    ).toEqual({
      a1: [10, 20, 30],
      a2: [
        new Date('1998-01-01'),
        new Date('1999-01-01'),
        new Date('2000-01-01'),
      ],
    })
  })

  it('should serialize content with file', async () => {
    const file = new File(['test content'], 'test.txt', {
      type: 'text/plain',
    })

    const { body } = new OpenAPISerializer().serialize({
      name: 'test',
      object: { a: 1, b: 2 },
      file: file,
      nested: {
        file: file,
        '[]file\\]': file,
      },
    })

    if (!(body instanceof FormData)) throw new Error('body must be FormData')

    expect(body.get('file')).toBeInstanceOf(Blob)
    expect(body.get('nested[file]')).toBeInstanceOf(Blob)
    expect(body.get('object[a]')).toBe('1')
    expect(body.get('object[b]')).toBe('2')
    expect(body.get('name')).toBe('test')
    expect(body.get('nested[\\[\\]file\\\\\\]]')).toBeInstanceOf(Blob)
  })
})
