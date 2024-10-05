import { eachContractRouterLeaf, initORPCContract } from '.'

test('each router leaf', () => {
  const orpc = initORPCContract

  const router = {
    ping: orpc.route({
      method: 'GET',
      path: '/ping',
    }),
    user: {
      find: orpc.route({
        method: 'GET',
        path: '/users/{id}',
      }),
    },
  }

  const calls: string[] = []

  eachContractRouterLeaf(router, (procedure, path) => {
    calls.push(path.join('.'))
  })

  expect(calls).toEqual(['ping', 'user.find'])
})
