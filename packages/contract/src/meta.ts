export type Meta = Record<string, any>
export type TypeMeta<T extends Meta> = { type: T }

export type StrictMeta<TDef extends Meta, TMeta extends TDef> = TMeta & Partial<Record<Exclude<keyof TDef, keyof TMeta>, undefined>>

export type MergedMeta<T1 extends Meta, T2 extends Meta> = Omit<T1, keyof T2> & T2

export function mergeMeta<T1 extends Meta, T2 extends Meta>(meta1: T1, meta2: T2): MergedMeta<T1, T2> {
  return { ...meta1, ...meta2 }
}
