/// <reference lib="dom" />

export type Body = string | FormData | Blob

export interface Serialized {
  body: Body
  headers: Headers
}

export interface Serializer {
  serialize: (payload: unknown) => Serialized
}

export type Deserialized = Promise<unknown>

export interface Deserializer {
  deserialize: (re: Request | Response) => Deserialized
}
