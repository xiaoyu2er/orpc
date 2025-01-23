import type { baseErrorMap, BaseMetaDef } from '../../contract/tests/shared'
import type { CurrentContext } from '../tests/shared'
import type { ORPCErrorConstructorMap } from './error'
import type { Middleware } from './middleware'
import type { DecoratedMiddleware } from './middleware-decorated'

const decorated = {} as DecoratedMiddleware<
  CurrentContext,
  { extra: boolean },
  unknown,
  unknown,
  ORPCErrorConstructorMap<typeof baseErrorMap>,
  BaseMetaDef
>

describe('DecoratedMiddleware', () => {
  it('is a middleware', () => {
    expectTypeOf(decorated).toMatchTypeOf<
      Middleware<
        CurrentContext,
        { extra: boolean },
        unknown,
        unknown,
        ORPCErrorConstructorMap<typeof baseErrorMap>,
        BaseMetaDef
      >
    >()
  })

  it('.mapInput', () => {
    const mapped = decorated.mapInput((input: 'input') => ({ mapped: input }))

    expectTypeOf(mapped).toEqualTypeOf<
      DecoratedMiddleware<
        CurrentContext,
        { extra: boolean },
        'input',
        unknown,
        ORPCErrorConstructorMap<typeof baseErrorMap>,
        BaseMetaDef
      >
    >()
  })

  describe('.concat', () => {
    it('without map input', () => {
      const mapped = decorated.concat(
        ({ next }, input: 'input') => next({ context: { extra2: true } }),
      )

      expectTypeOf(mapped).toEqualTypeOf<
        DecoratedMiddleware<
          CurrentContext,
          { extra: boolean } & { extra2: boolean },
          'input',
          unknown,
          ORPCErrorConstructorMap<typeof baseErrorMap>,
          BaseMetaDef
        >
      >()

      decorated.concat(
        // @ts-expect-error - conflict context
        ({ next }, input: 'input') => next({ context: { extra: 'invalid' } }),
      )
    })

    it('with map input', () => {
      const mapped = decorated.concat(
        ({ next }, input) => {
          expectTypeOf(input).toEqualTypeOf<{ mapped: 'input' }>()
          return next({ context: { extra2: true } })
        },
        (input: 'input') => ({ mapped: input }),
      )

      expectTypeOf(mapped).toEqualTypeOf<
        DecoratedMiddleware<
          CurrentContext,
          { extra: boolean } & { extra2: boolean },
          'input',
          unknown,
          ORPCErrorConstructorMap<typeof baseErrorMap>,
          BaseMetaDef
        >
      >()

      decorated.concat(
        // @ts-expect-error - conflict context
        ({ next }) => next({ context: { extra: 'invalid' } }),
        (input: 'input') => ({ mapped: input }),
      )
    })
  })
})
