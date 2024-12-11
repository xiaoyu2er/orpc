import type { SchemaOutput } from '@orpc/contract'
import type { UserFindInputSchema, UserListInputSchema, UserListOutputSchema, UserSchema } from '../../tests/orpc'
import { orpcClient } from '../../tests/orpc'
import { createUseQueriesBuilder } from './builder'
import { createUseQueriesBuilders } from './builders'

it('createUseQueriesBuilders', () => {
  const builder = createUseQueriesBuilders({
    client: orpcClient,
  })

  expectTypeOf(builder.user.find).toEqualTypeOf(
    createUseQueriesBuilder<typeof UserFindInputSchema, typeof UserSchema, SchemaOutput<typeof UserSchema>>({
      client: orpcClient.user.find,
      path: ['user', 'find'],
    }),
  )

  expectTypeOf(builder.user.list).toEqualTypeOf(
    createUseQueriesBuilder<typeof UserListInputSchema, typeof UserListOutputSchema, SchemaOutput<typeof UserListOutputSchema>>({
      client: orpcClient.user.list,
      path: ['user', 'list'],
    }),
  )

  expectTypeOf(builder.ping).toEqualTypeOf(
    createUseQueriesBuilder({
      client: orpcClient.ping,
      path: ['ping'],
    }),
  )
})
