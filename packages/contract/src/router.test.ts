import { eachContractRouterLeaf, ioc } from '.'

test('each router leaf', () => {
  const oc = ioc

  const router = {
    ping: oc.route({
      method: 'GET',
      path: '/ping',
    }),
    user: {
      find: oc.route({
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
