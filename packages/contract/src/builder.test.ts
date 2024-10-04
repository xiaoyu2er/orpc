import { z } from 'zod'
import {
  type ContractProcedure,
  type ContractRouter,
  eachContractRouterLeaf,
  initORPCContract,
} from '.'

describe('define a procedure', () => {
  const orpc = initORPCContract

  test('use route method', () => {
    const procedure = orpc.route({
      method: 'GET',
      path: '/users/{id}',
      deprecated: true,
      summary: 'Get user',
      description: 'Get user by id',
    })

    expectTypeOf(procedure).toEqualTypeOf<
      ContractProcedure<undefined, undefined>
    >()

    expect(procedure.__cp).toMatchObject({
      method: 'GET',
      path: '/users/{id}',
      deprecated: true,
      summary: 'Get user',
      description: 'Get user by id',
    })
  })

  test('use input method', () => {
    const schema = z.object({
      id: z.string(),
    })

    const procedure = orpc.input(schema, { id: '123' }, { user: { id: '123' } })

    expectTypeOf(procedure).toEqualTypeOf<
      ContractProcedure<typeof schema, undefined>
    >()

    expect(procedure.__cp).toMatchObject({
      InputSchema: schema,
      inputExample: { id: '123' },
      inputExamples: { user: { id: '123' } },
    })
  })

  test('use output method', () => {
    const schema = z.object({ id: z.string() })

    const procedure = orpc.output(
      schema,
      { id: '123' },
      { user: { id: '123' } },
    )

    expectTypeOf(procedure).toEqualTypeOf<
      ContractProcedure<undefined, typeof schema>
    >()

    expect(procedure.__cp).toMatchObject({
      OutputSchema: schema,
      outputExample: { id: '123' },
      outputExamples: { user: { id: '123' } },
    })
  })
})

test('define a router', () => {
  const orpc = initORPCContract

  const schema1 = z.string()
  const schema2 = z.object({ id: z.string() })
  const schema3 = z.object({ name: z.string() })
  const ping = orpc.output(schema1)
  const find = orpc.input(schema2).output(schema3)

  const router = orpc.router({
    ping,
    user: {
      find,
    },
    user2: orpc.router({
      find,
    }),
  })

  expectTypeOf(router).toMatchTypeOf<{
    ping: typeof ping
    user: {
      find: typeof find
    }
    user2: {
      find: typeof find
    }
  }>()

  expect(router).toMatchObject({
    ping,
    user: {
      find,
    },
    user2: {
      find,
    },
  })
})
