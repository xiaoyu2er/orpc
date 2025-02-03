import { ContractProcedure } from '@orpc/contract'
import { z } from 'zod'
import { router as contract } from '../../contract/tests/shared'
import { ping, pong, router } from '../tests/shared'
import { implement } from './implementer'
import { Procedure } from './procedure'
import { convertPathToHttpPath, createContractedProcedure, eachAllContractProcedure, eachContractProcedure } from './utils'

describe('eachContractProcedure', () => {
  it('with contract', () => {
    const contract2: any = []

    const result = eachContractProcedure({
      path: [],
      router: contract,
    }, ({ path, contract }) => {
      contract2.push({
        path,
        contract,
      })
    })

    expect(result).toEqual([])
    expect(contract2).toEqual([
      { path: ['ping'], contract: contract.ping },
      { path: ['pong'], contract: contract.pong },
      { path: ['nested', 'ping'], contract: contract.nested.ping },
      { path: ['nested', 'pong'], contract: contract.nested.pong },
    ])
  })

  it('with router', () => {
    const router2: any = []

    const result = eachContractProcedure({
      path: [],
      router,
    }, ({ path, contract }) => {
      router2.push({
        path,
        contract,
      })
    })

    expect(result).toEqual([
      { path: ['ping'], lazied: router.ping },
      { path: ['nested'], lazied: router.nested },
    ])

    expect(router2).toEqual([
      { path: ['pong'], contract: router.pong },
    ])
  })

  it('with implemented router', () => {
    const implemented = implement(contract).$context<any>().router(router)

    const router2: any = []

    const result = eachContractProcedure({
      path: [],
      router: implemented,
    }, ({ path, contract }) => {
      router2.push({
        path,
        contract,
      })
    })

    expect(result).toEqual([])
    expect(router2).toEqual([
      { path: ['ping'], contract: contract.ping },
      { path: ['pong'], contract: contract.pong },
      { path: ['nested', 'ping'], contract: contract.nested.ping },
      { path: ['nested', 'pong'], contract: contract.nested.pong },
    ])
  })
})

it('eachAllContractProcedure', async () => {
  const router2: any = []

  await eachAllContractProcedure({
    path: [],
    router,
  }, ({ path, contract }) => {
    router2.push({
      path,
      contract,
    })
  })

  expect(router2).toEqual([
    { path: ['pong'], contract: pong },
    { path: ['ping'], contract: ping },
    { path: ['nested', 'ping'], contract: ping },
    { path: ['nested', 'pong'], contract: pong },
  ])
})

it('convertPathToHttpPath', () => {
  expect(convertPathToHttpPath(['ping'])).toEqual('/ping')
  expect(convertPathToHttpPath(['nested', 'ping'])).toEqual('/nested/ping')
  expect(convertPathToHttpPath(['nested/', 'ping'])).toEqual('/nested%2F/ping')
})

it('createContractedProcedure', () => {
  const mismatchPath = {
    errorMap: {
      MISMATCH_HERE: {},
    },
    meta: {
      MISMATCH_HERE: {},
    },
    route: {
      path: '/MISMATCH_HERE',
    },
  } as const

  const contracted = createContractedProcedure(new ContractProcedure({
    ...contract.ping['~orpc'],
    ...mismatchPath,
    inputSchema: z.object({}), // this will be ignored
  }), ping)

  expect(contracted).toBeInstanceOf(Procedure)
  expect(contracted['~orpc']).toEqual({
    ...ping['~orpc'],
    ...mismatchPath,
  })
})
