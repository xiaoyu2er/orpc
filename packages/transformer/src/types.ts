/// <reference lib="dom" />

export type Body = string | FormData | Blob

export interface Transformer {
  serialize(payload: unknown): {
    body: Body
    headers: Headers
  }

  deserialize(re: Request | Response): Promise<unknown>
}

export interface Serializer {
  serialize(payload: unknown): {
    body: Body
    headers: Headers
  }
}

export interface Deserializer {
  deserialize(re: Request | Response): Promise<unknown>
}
