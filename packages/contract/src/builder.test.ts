import { z } from 'zod'
import { type DecoratedContractProcedure, initORPCContract } from '.'

describe('define a procedure', () => {
  const orpc = initORPCContract

  test('use route method', () => {
    const procedure = orpc.route({
      method: 'GET',
      path: '/users/{id}',
      deprecated: true,
      summary: 'Get user',
      description: 'Get user by id',
      tags: ['bbbb'],
    })

    expectTypeOf(procedure).toEqualTypeOf<
      DecoratedContractProcedure<undefined, undefined>
    >()

    expect(procedure.zz$cp).toMatchObject({
      method: 'GET',
      path: '/users/{id}',
      deprecated: true,
      summary: 'Get user',
      description: 'Get user by id',
      tags: ['bbbb'],
    })
  })

  test('use input method', () => {
    const schema = z.object({
      id: z.string(),
    })

    const procedure = orpc.input(schema, { id: '123' }, { user: { id: '123' } })

    expectTypeOf(procedure).toEqualTypeOf<
      DecoratedContractProcedure<typeof schema, undefined>
    >()

    expect(procedure.zz$cp).toMatchObject({
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
      DecoratedContractProcedure<undefined, typeof schema>
    >()

    expect(procedure.zz$cp).toMatchObject({
      OutputSchema: schema,
      outputExample: { id: '123' },
      outputExamples: { user: { id: '123' } },
    })
  })
})

describe('define a router', () => {
  it('simple', () => {
    const orpc = initORPCContract

    const schema1 = z.string()
    const schema2 = z.object({ id: z.string() })
    const ping = orpc.output(schema1)
    const find = orpc.output(schema2)

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

  it('with prefix', () => {
    const orpc = initORPCContract

    const schema1 = z.string()
    const schema2 = z.object({ id: z.string() })
    const ping = orpc.output(schema1)
    const find = orpc.output(schema2)

    const router = orpc.router({
      ping: ping.prefix('/ping'),
      user: {
        find,
      },
      user2: orpc
        .prefix('/internal')
        .prefix('/user2')
        .router({
          find2: find.prefix('/find2'),
        }),
    })

    expectTypeOf(router).toMatchTypeOf<{
      ping: typeof ping
      user: {
        find: typeof find
      }
      user2: {
        find2: typeof find
      }
    }>()

    expect(router).toMatchObject({
      ping: ping.prefix('/ping'),
      user: {
        find,
      },
      user2: {
        find2: find.prefix('/internal/user2/find2'),
      },
    })
  })

  it('with tags', () => {
    const orpc = initORPCContract

    const schema1 = z.string()
    const schema2 = z.object({ id: z.string() })
    const ping = orpc.output(schema1)
    const find = orpc.output(schema2)

    const router = orpc.router({
      ping: ping.prefix('/ping'),
      user: {
        find,
      },
      user2: orpc
        .tags('user')
        .tags('internal')
        .router({
          find2: find.prefix('/find2'),
        }),
    })

    expectTypeOf(router).toMatchTypeOf<{
      ping: typeof ping
      user: {
        find: typeof find
      }
      user2: {
        find2: typeof find
      }
    }>()

    expect(router).toMatchObject({
      ping: ping.prefix('/ping'),
      user: {
        find,
      },
      user2: {
        find2: find.addTags('user', 'internal'),
      },
    })
  })
})
