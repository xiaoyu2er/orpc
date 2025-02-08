export type MaybeOptionalOptions<TOptions> =
  | [options: TOptions]
  | (Record<never, never> extends TOptions ? [] : never)

export type SetOptional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>
