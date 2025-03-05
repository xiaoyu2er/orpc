import { z } from 'zod'
import { customJsonSchema } from './custom-json-schema'

describe('customJsonSchema', () => {
  it('both strategy', () => {
    customJsonSchema(z.string(), {
      examples: ['string'],
    })
    customJsonSchema(z.string(), {
      // @ts-expect-error --- must be string
      examples: [123],
    })

    customJsonSchema(z.string().transform(v => Number(v)), {
      examples: [{} as never],
    })
    customJsonSchema(z.string().transform(v => Number(v)), {
      // @ts-expect-error --- must be never
      examples: ['string'],
    })
    customJsonSchema(z.string().transform(v => Number(v)), {
      // @ts-expect-error --- must be never
      examples: [123],
    })
  })

  it('input strategy', () => {
    customJsonSchema(z.string(), {
      examples: ['string'],
    }, 'input')
    customJsonSchema(z.string(), {
      // @ts-expect-error --- must be string
      examples: [123],
    }, 'input')

    customJsonSchema(z.string().transform(v => Number(v)), {
      examples: ['string'],
    }, 'input')
    customJsonSchema(z.string().transform(v => Number(v)), {
      // @ts-expect-error --- must be string
      examples: [123],
    }, 'input')
  })

  it('output strategy', () => {
    customJsonSchema(z.string(), {
      examples: ['string'],
    }, 'output')
    customJsonSchema(z.string(), {
      // @ts-expect-error --- must be string
      examples: [123],
    }, 'output')

    customJsonSchema(z.string().transform(v => Number(v)), {
      examples: [123],
    }, 'output')
    customJsonSchema(z.string().transform(v => Number(v)), {
      // @ts-expect-error --- must be number
      examples: ['string'],
    }, 'output')
  })
})
