export type InitialContext = { db: string }
export type CurrentContext = InitialContext & { auth: boolean }
