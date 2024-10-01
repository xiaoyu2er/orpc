import type { ZodType, input, output } from 'zod'

export type HTTPPath = `/${string}` | undefined
export type HTTPMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | undefined
export type HTTPStatus = number | undefined

export type StandardizeHTTPPath<T extends HTTPPath> = T extends undefined | '/'
  ? T
  : T extends ''
    ? '/'
    : T extends `/${infer P1}//${infer P2}`
      ? StandardizeHTTPPath<`/${P1}/${P2}`>
      : T extends `//${infer P}`
        ? StandardizeHTTPPath<`/${P}`>
        : T extends `/${infer P}//`
          ? StandardizeHTTPPath<`/${P}`>
          : T extends `/${infer P}/`
            ? StandardizeHTTPPath<`/${P}`>
            : T

export type PrefixHTTPPath<
  TPrefix extends Exclude<HTTPPath, undefined>,
  TPath extends HTTPPath,
> = TPath extends undefined
  ? TPath
  : StandardizeHTTPPath<TPrefix> extends '/'
    ? StandardizeHTTPPath<TPath>
    : StandardizeHTTPPath<TPath> extends '/'
      ? StandardizeHTTPPath<TPrefix>
      : StandardizeHTTPPath<TPrefix> extends `/${infer UPrefix}`
        ? `/${UPrefix}${StandardizeHTTPPath<TPath>}`
        : never

export type Schema = ZodType<any, any, any> | undefined

export type SchemaInput<
  TSchema extends Schema,
  TFallback = unknown,
> = TSchema extends undefined
  ? TFallback
  : TSchema extends ZodType<any, any, any>
    ? input<TSchema>
    : TFallback

export type SchemaOutput<
  TSchema extends Schema,
  TFallback = unknown,
> = TSchema extends undefined
  ? TFallback
  : TSchema extends ZodType<any, any, any>
    ? output<TSchema>
    : TFallback

export type IsEqual<A, B> = (<G>() => G extends A ? 1 : 2) extends <
  G,
>() => G extends B ? 1 : 2
  ? true
  : false
