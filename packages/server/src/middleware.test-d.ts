import type { ErrorMap, Route, Schema } from '@orpc/contract'
import type { baseErrorMap, BaseMetaDef } from '../../contract/tests/shared'
import type { Context } from './context'
import type { ORPCErrorConstructorMap } from './error'
import type { Middleware, MiddlewareNextFn, MiddlewareOutputFn } from './middleware'
import type { Procedure } from './procedure'

describe('middleware', () => {
  it('just a function', () => {
    const mid: Middleware<
      { auth: boolean },
      Record<never, never>,
      { input: number },
      { output: string },
      ORPCErrorConstructorMap<typeof baseErrorMap>,
      BaseMetaDef
    > = ({ context, path, procedure, signal, next, errors }, input, output) => {
      expectTypeOf(input).toEqualTypeOf<{ input: number }>()
      expectTypeOf(context).toEqualTypeOf<{ auth: boolean }>()
      expectTypeOf(path).toEqualTypeOf<string[]>()
      expectTypeOf(procedure).toEqualTypeOf<
        Procedure<Context, Context, Schema, Schema, unknown, ErrorMap, Route, BaseMetaDef, BaseMetaDef>
      >()
      expectTypeOf(signal).toEqualTypeOf<undefined | InstanceType<typeof AbortSignal>>()
      expectTypeOf(output).toEqualTypeOf<MiddlewareOutputFn<{ output: string }>>()
      expectTypeOf(next).toEqualTypeOf<MiddlewareNextFn<{ auth: boolean }, { output: string }>>()
      expectTypeOf(errors).toEqualTypeOf<ORPCErrorConstructorMap<typeof baseErrorMap>>()

      return next()
    }

    // @ts-expect-error - missing return type
    const mid3: Middleware<{ auth: boolean }, undefined, unknown, unknown> = () => {
    }
  })

  it('require return valid extra context', () => {
    const mid0: Middleware<Context, Record<never, never>, unknown, unknown, Record<never, never>, BaseMetaDef> = ({ next }) => {
      return next()
    }

    const mid: Middleware<Context, { userId: string }, unknown, unknown, Record<never, never>, BaseMetaDef> = ({ next }) => {
      return next({ context: { userId: '1' } })
    }

    // @ts-expect-error invalid extra context
    const mid2: Middleware<Context, { userId: string }, unknown, unknown, BaseMetaDef> = ({ next }) => {
      return next({ context: { userId: 1 } })
    }

    // @ts-expect-error require return extra context
    const mid3: Middleware<Context, { userId: string }, unknown, unknown, BaseMetaDef> = ({ next }) => {
      return next()
    }
  })
})
