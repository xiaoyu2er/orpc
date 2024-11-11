import { z } from 'zod'
import { oz } from '../src'

describe('openapi function', () => {
  const schema = z.object({
    name: z.string(),
  })

  it('infer schema for examples', () => {
    oz.openapi(schema, {
      examples: [{ name: '23' }],
    })

    oz.openapi(schema, {
      // @ts-expect-error
      examples: [{ a: '23' }],
    })

    oz.openapi(schema, {
      // @ts-expect-error
      examples: [12343],
    })
  })

  it('strict on input & output', () => {
    const schema = z.object({
      name: z.string().transform((val) => val.length),
    })

    oz.openapi(schema, {
      // @ts-expect-error name should be never
      examples: [{ name: '23' }],
    })

    oz.openapi(
      schema,
      {
        examples: [{ name: '23' }],
      },
      { mode: 'input' },
    )
    oz.openapi(
      schema,
      {
        // @ts-expect-error invalid name
        examples: [{ name: 23 }],
      },
      { mode: 'input' },
    )

    oz.openapi(
      schema,
      {
        examples: [{ name: 23 }],
      },
      { mode: 'output' },
    )
    oz.openapi(
      schema,
      {
        // @ts-expect-error invalid name
        examples: [{ name: '23' }],
      },
      { mode: 'output' },
    )
  })
})
