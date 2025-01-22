export type Context = Record<string, any>

export type TypeInitialContext<T extends Context> = (type: T) => any

export type TypeCurrentContext<T extends Context> = { type: T }
