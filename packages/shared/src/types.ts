export type MaybeOptionalOptions<TOptions> =
  | [options: TOptions]
  | (Record<never, never> extends TOptions ? [] : never)
