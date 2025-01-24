import { safe } from './client-utils'
import { ORPCError } from './error-orpc'

it('safe', async () => {
  const r1 = await safe(Promise.resolve(1))
  expect(r1).toEqual([1, undefined, false])

  const e2 = new Error('error')
  const r2 = await safe(Promise.reject(e2))
  expect(r2).toEqual([undefined, e2, false])

  const e3 = new ORPCError('BAD_GATEWAY', { defined: true })
  const r3 = await safe(Promise.reject(e3))
  expect(r3).toEqual([undefined, e3, true])

  const e4 = new ORPCError('BAD_GATEWAY')
  const r4 = await safe(Promise.reject(e4))
  expect(r4).toEqual([undefined, e4, false])
})
