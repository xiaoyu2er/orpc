export type SetOptional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>

export type IntersectPick<T, U> = Pick<T, keyof T & keyof U>
