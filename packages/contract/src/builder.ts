import type { ErrorMap, ErrorMapGuard } from './error-map'
import type { RouteOptions } from './procedure'
import type { ContractRouter } from './router'
import type { HTTPPath, PreventNever, Schema, SchemaInput, SchemaOutput } from './types'

import { DecoratedContractProcedure } from './procedure-decorated'
import { ContractRouterBuilder } from './router-builder'

export type ContractBuilderDef<TErrorMap extends ErrorMap> = {
  errorMap: TErrorMap
}

export class ContractBuilder<TErrorMap extends ErrorMap> {
  '~type' = 'ContractBuilder' as const
  '~orpc': ContractBuilderDef<TErrorMap>

  constructor(def: ContractBuilderDef<TErrorMap>) {
    this['~orpc'] = def
  }

  errors<const U extends ErrorMap & ErrorMapGuard<TErrorMap>>(errors: U): PreventNever<TErrorMap & U> & ContractBuilder<U & TErrorMap> {
    const builder = new ContractBuilder({
      ...this['~orpc'],
      errorMap: {
        ...this['~orpc'].errorMap,
        ...errors,
      },
    })

    return builder as typeof builder & PreventNever<TErrorMap & U>
  }

  prefix(prefix: HTTPPath): ContractRouterBuilder {
    return new ContractRouterBuilder({
      prefix,
    })
  }

  tag(...tags: string[]): ContractRouterBuilder {
    return new ContractRouterBuilder({
      tags,
    })
  }

  route(route: RouteOptions): DecoratedContractProcedure<undefined, undefined, TErrorMap> {
    return new DecoratedContractProcedure({
      route,
      InputSchema: undefined,
      OutputSchema: undefined,
      errorMap: this['~orpc'].errorMap,
    })
  }

  input<U extends Schema>(schema: U, example?: SchemaInput<U>): DecoratedContractProcedure<U, undefined, TErrorMap> {
    return new DecoratedContractProcedure({
      InputSchema: schema,
      inputExample: example,
      OutputSchema: undefined,
      errorMap: this['~orpc'].errorMap,
    })
  }

  output<U extends Schema>(schema: U, example?: SchemaOutput<U>): DecoratedContractProcedure<undefined, U, TErrorMap> {
    return new DecoratedContractProcedure({
      OutputSchema: schema,
      outputExample: example,
      InputSchema: undefined,
      errorMap: this['~orpc'].errorMap,
    })
  }

  router<T extends ContractRouter>(router: T): T {
    return router
  }
}
