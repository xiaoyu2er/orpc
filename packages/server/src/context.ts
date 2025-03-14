export type Context = Record<string, any>

export type MergedInitialContext<
  TInitial extends Context,
  TAdditional extends Context,
  TCurrent extends Context,
> = TInitial & Omit<TAdditional, keyof TCurrent>

export type MergedCurrentContext<T extends Context, U extends Context> = Omit<T, keyof U> & U

export function mergeCurrentContext<T extends Context, U extends Context>(
  context: T,
  other: U,
): MergedCurrentContext<T, U> {
  return { ...context, ...other }
}

export type ContextExtendsGuard<T extends Context, U extends Context> = T extends T & U ? unknown : never
