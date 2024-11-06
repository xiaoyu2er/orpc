import { z } from 'zod'
import { type DecoratedContractProcedure, ioc } from '.'

describe('define a procedure', () => {
  const oc = ioc

  test('use route method', () => {
    const procedure = oc.route({
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

    const procedure = oc.input(schema, { id: '123' }, { user: { id: '123' } })

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

    const procedure = oc.output(schema, { id: '123' }, { user: { id: '123' } })

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
    const oc = ioc

    const schema1 = z.string()
    const schema2 = z.object({ id: z.string() })
    const ping = oc.output(schema1)
    const find = oc.output(schema2)

    const router = oc.router({
      ping,
      user: {
        find,
      },
      user2: oc.router({
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
    const oc = ioc

    const schema1 = z.string()
    const schema2 = z.object({ id: z.string() })
    const ping = oc.output(schema1)
    const find = oc.output(schema2)

    const router = oc.router({
      ping: ping.prefix('/ping'),
      user: {
        find,
      },
      user2: oc
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
    const oc = ioc

    const schema1 = z.string()
    const schema2 = z.object({ id: z.string() })
    const ping = oc.output(schema1)
    const find = oc.output(schema2)

    const router = oc.router({
      ping: ping.prefix('/ping'),
      user: {
        find,
      },
      user2: oc
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
