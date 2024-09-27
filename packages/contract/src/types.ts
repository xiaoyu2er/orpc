import { input, output, ZodType } from 'zod'

export type HTTPPath = `/${string}`
export type HTTPMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
export type HTTPStatus = number

export type StandardizeHTTPPath<T extends HTTPPath> = T extends ''
  ? '/'
  : T extends '/'
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
  TPrefix extends HTTPPath,
  TPath extends HTTPPath
> = StandardizeHTTPPath<TPrefix> extends '/'
  ? StandardizeHTTPPath<TPath>
  : StandardizeHTTPPath<TPath> extends '/'
  ? StandardizeHTTPPath<TPrefix>
  : StandardizeHTTPPath<TPrefix> extends `/${infer UPrefix}`
  ? `/${UPrefix}${StandardizeHTTPPath<TPath>}`
  : never

export type Schema = ZodType<any, any, any>
export type SchemaInput<TSchema extends Schema, TFallback = unknown> = IsAnyOrEqual<
  TSchema,
  Schema
> extends true
  ? TFallback
  : input<TSchema>

export type SchemaOutput<TSchema extends Schema, TFallback = unknown> = IsAnyOrEqual<
  TSchema,
  Schema
> extends true
  ? TFallback
  : output<TSchema>

export type IsEqual<A, B> = (<G>() => G extends A ? 1 : 2) extends <G>() => G extends B ? 1 : 2
  ? true
  : false

export type IsAnyOrEqual<A, B> = IsEqual<A, any> extends true ? true : IsEqual<A, B>
