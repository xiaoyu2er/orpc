import { router as contract } from '../../../../contract/tests/shared'
import { ping, pong, router } from '../../../tests/shared'
import { implement } from '../../implementer'
import { Procedure } from '../../procedure'
import { RPCMatcher } from './rpc-matcher'

describe('rpcMatcher', () => {
  it('with router', async () => {
    const rpcMatcher = new RPCMatcher()
    rpcMatcher.init(router)

    expect(await rpcMatcher.match('ANYTHING', '/ping')).toEqual({
      path: ['ping'],
      procedure: ping,
    })

    expect(await rpcMatcher.match('ANYTHING', '/nested/ping')).toEqual({
      path: ['nested', 'ping'],
      procedure: ping,
    })

    expect(await rpcMatcher.match('ANYTHING', '/pong')).toEqual({
      path: ['pong'],
      procedure: pong,
    })

    expect(await rpcMatcher.match('ANYTHING', '/nested/pong')).toEqual({
      path: ['nested', 'pong'],
      procedure: pong,
    })

    expect(await rpcMatcher.match('ANYTHING', '/')).toEqual(undefined)
    expect(await rpcMatcher.match('ANYTHING', '/not_found')).toEqual(undefined)
  })

  it('with implemented router', async () => {
    const rpcMatcher = new RPCMatcher()
    rpcMatcher.init(implement(contract).$context<any>().router({
      ...router,
      pong: new Procedure({
        ...pong['~orpc'],
        errorMap: {
          SOMETHING_THAT_VIOLATES_THE_CONTRACT: {},
        },
        meta: {
          SOMETHING_THAT_VIOLATES_THE_CONTRACT: {},
        },
        route: {
          path: '/SOMETHING_THAT_VIOLATES_THE_CONTRACT',
        },
      }),
    }))

    expect(await rpcMatcher.match('ANYTHING', '/ping')).toEqual({
      path: ['ping'],
      procedure: ping,
    })

    expect(await rpcMatcher.match('ANYTHING', '/nested/ping')).toEqual({
      path: ['nested', 'ping'],
      procedure: ping,
    })

    expect(await rpcMatcher.match('ANYTHING', '/pong')).toEqual({
      path: ['pong'],
      procedure: pong, // this mean the contract is applied to the procedure
    })

    expect(await rpcMatcher.match('ANYTHING', '/nested/pong')).toEqual({
      path: ['nested', 'pong'],
      procedure: pong,
    })

    expect(await rpcMatcher.match('ANYTHING', '/')).toEqual(undefined)
    expect(await rpcMatcher.match('ANYTHING', '/not_found')).toEqual(undefined)
  })

  it('with missing implementation', async () => {
    const rpcMatcher = new RPCMatcher()
    rpcMatcher.init(implement(contract).$context<any>().router({
      ...router,
      pong: undefined as any, // missing here
    }))

    // still work normally with other implementation
    expect(await rpcMatcher.match('ANYTHING', '/ping')).toEqual({
      path: ['ping'],
      procedure: ping,
    })

    expect(await rpcMatcher.match('ANYTHING', '/nested/ping')).toEqual({
      path: ['nested', 'ping'],
      procedure: ping,
    })

    expect(rpcMatcher.match('ANYTHING', '/pong')).rejects.toThrowError()

    expect(await rpcMatcher.match('ANYTHING', '/nested/pong')).toEqual({
      path: ['nested', 'pong'],
      procedure: pong,
    })

    expect(await rpcMatcher.match('ANYTHING', '/')).toEqual(undefined)
    expect(await rpcMatcher.match('ANYTHING', '/not_found')).toEqual(undefined)
  })
})
