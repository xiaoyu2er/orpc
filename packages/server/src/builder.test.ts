import { initORPCContract } from '@orpc/contract'
import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { Procedure, ProcedureImplementer, RouterImplementer, initORPC } from '.'

describe('chain router implementer', () => {
  const pingContract = initORPCContract.input(z.string()).output(z.string())
  const userFindContract = initORPCContract
    .input(z.object({ id: z.string() }))
    .output(z.object({ name: z.string() }))

  const contract = initORPCContract.router({
    ping: pingContract,
    user: {
      find: userFindContract,
    },

    router: userFindContract,
  })

  const orpc = initORPC.contract(contract)

  it('works', () => {
    expect(orpc.ping).instanceOf(ProcedureImplementer)
    expect(orpc.ping.__pi.contract).toEqual(pingContract)

    expect(orpc.user).instanceOf(RouterImplementer)

    expect(orpc.user.find).instanceOf(ProcedureImplementer)
    expect(orpc.user.find.__pi.contract).toEqual(userFindContract)
  })

  it('works on special `router` keyword', () => {
    expect(orpc.router.__pi.contract).toEqual(userFindContract)
    expect(
      orpc.router.handler(() => {
        return { name: '' }
      }),
    ).toBeInstanceOf(Procedure)
  })
})
