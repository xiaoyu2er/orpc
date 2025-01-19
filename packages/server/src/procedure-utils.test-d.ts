import type { ORPCError } from '@orpc/contract'
import type { Context } from './context'
import type { Procedure } from './procedure'
import { safe } from '@orpc/contract'
import { z } from 'zod'
import { call } from './procedure-utils'

const schema = z.object({
  val: z.string().transform(v => Number.parseInt(v)),
})

const baseErrors = {
  CODE: {
    data: z.object({
      why: z.string(),
    }),
  },
}

const procedure = {} as Procedure<Context, Context, typeof schema, typeof schema, { val: string }, typeof baseErrors>
const procedureWithContext = {} as Procedure<{ db: string }, { auth: boolean }, typeof schema, typeof schema, { val: string }, typeof baseErrors>

describe('call', () => {
  it('infer input', async () => {
    call(procedure, { val: '123' })
    // @ts-expect-error - invalid input
    call(procedure, { val: 123 })
  })

  it('infer output', async () => {
    const output = await call(procedure, { val: '123' })
    expectTypeOf(output).toEqualTypeOf<{ val: number }>()
  })

  it('infer error', async () => {
    const [output, error] = await safe(call(procedure, { val: '123' }))

    expectTypeOf(error).toEqualTypeOf<
      | undefined
      | Error
      | ORPCError<'CODE', { why: string }>
    >()
  })

  it('infer context', async () => {
    call(procedure, { val: '123' })
    call(procedureWithContext, { val: '123' }, { context: { db: 'postgres' } })
    // @ts-expect-error - context is required
    call(procedureWithContext, { val: '123' })
    // @ts-expect-error - invalid context
    call(procedureWithContext, { val: '123' }, { context: { db: 1 } })
  })
})
