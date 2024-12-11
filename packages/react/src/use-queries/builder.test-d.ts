import type { SchemaOutput } from '@orpc/contract'
import type { Promisable } from '@orpc/shared'
import type { UserFindInputSchema, UserSchema } from '../../tests/orpc'
import { orpcClient } from '../../tests/orpc'
import { createUseQueriesBuilder } from './builder'

it('createUseQueriesBuilder', () => {
  const builder = createUseQueriesBuilder<typeof UserFindInputSchema, typeof UserSchema, SchemaOutput<typeof UserSchema>>({
    client: orpcClient.user.find,
    path: ['user', 'find'],
  })

  expectTypeOf<Parameters<typeof builder>[0]>().toEqualTypeOf<{
    id: string
  }>()

  const result = builder({ id: '123' }, { throwOnError: true })

  builder({ id: '123' })
  //   @ts-expect-error invalid input
  builder({ id: 123 })

  if (typeof result.queryFn === 'function') {
    expectTypeOf(result.queryFn({} as any)).toMatchTypeOf<
      Promisable<{
        id: string
        name: string
      }>
    >()
  }
})
