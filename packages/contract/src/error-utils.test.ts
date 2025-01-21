import type { ErrorMap } from './error-map'
import { z } from 'zod'
import { ORPCError } from './error-orpc'
import { isDefinedError, validateORPCError } from './error-utils'

describe('validateORPCError', () => {
  const errors: ErrorMap = {
    BAD_GATEWAY: {
      data: z.object({
        value: z.string().transform(v => Number.parseInt(v)),
      }),
    },
    CONFLICT: {
    },
  }

  it('ignore not-match errors when defined=false', async () => {
    const e1 = new ORPCError({ code: 'BAD_GATEWAY', status: 501 })
    expect(await validateORPCError(errors, e1)).toBe(e1)

    const e2 = new ORPCError({ code: 'NOT_FOUND' })
    expect(await validateORPCError(errors, e2)).toBe(e2)

    const e3 = new ORPCError({ code: 'BAD_GATEWAY', data: 'invalid' })
    expect(await validateORPCError(errors, e3)).toBe(e3)
  })

  it('modify not-match errors when defined=true', async () => {
    const e1 = new ORPCError({ defined: true, code: 'BAD_GATEWAY', status: 501 })
    const v1 = await validateORPCError(errors, e1)
    expect(v1).not.toBe(e1)
    expect({ ...v1 }).toEqual({ ...e1, defined: false })

    const e2 = new ORPCError({ defined: true, code: 'NOT_FOUND' })
    const v2 = await validateORPCError(errors, e2)
    expect(v2).not.toBe(e2)
    expect({ ...v2 }).toEqual({ ...e2, defined: false })

    const e3 = new ORPCError({ defined: true, code: 'BAD_GATEWAY', data: 'invalid' })
    const v3 = await validateORPCError(errors, e3)
    expect(v3).not.toBe(e3)
    expect({ ...v3 }).toEqual({ ...e3, defined: false })
  })

  it('ignore match errors when defined=true and data schema is undefined', async () => {
    const e1 = new ORPCError({ defined: true, code: 'CONFLICT' })
    expect(await validateORPCError(errors, e1)).toBe(e1)
  })

  it('return new error when defined=true and data schema is undefined with match error', async () => {
    const e1 = new ORPCError({ code: 'CONFLICT' })
    const v1 = await validateORPCError(errors, e1)
    expect(v1).not.toBe(e1)
    expect({ ...v1 }).toEqual({ ...e1, defined: true })
  })

  it('return new with defined=true and validated data with match errors', async () => {
    const e1 = new ORPCError({ code: 'BAD_GATEWAY', data: { value: '123' } })
    const v1 = await validateORPCError(errors, e1)
    expect(v1).not.toBe(e1)
    expect({ ...v1 }).toEqual({ ...e1, defined: true, data: { value: 123 } })
  })
})

it('isDefinedError', () => {
  expect(isDefinedError(new ORPCError({ code: 'BAD_GATEWAY' }))).toBe(false)
  expect(isDefinedError(new ORPCError({ defined: true, code: 'BAD_GATEWAY' }))).toBe(true)
  expect(isDefinedError({ defined: true, code: 'BAD_GATEWAY' })).toBe(false)
})
