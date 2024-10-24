/// <reference lib="dom" />
/// <reference lib="dom.iterable" />

import { isPlainObject } from 'is-what'
import SuperJSON from 'superjson'

export const ORPC_TRANSFORMER_HEADER = 'X-ORPC-Transformer'

export function packIntoRequestResponseInit(
  data: unknown,
  headers?: Headers,
): { body: string | FormData | Blob; headers: Headers } {
  const headers_ = headers ?? new Headers()
  let body: string | FormData | Blob | undefined

  const { json, meta } = SuperJSON.serialize(data)
  const { map: blobsMap, blobs } = findBlobs(data)
  if (blobs.length > 0) {
    body = new FormData()
    body.append('data', JSON.stringify(json))
    body.append('meta', JSON.stringify(meta))
    body.append('blobsMap', JSON.stringify(blobsMap))

    for (const i in blobsMap) {
      body.append(i, blobs[i]!)
    }
  } else {
    headers_.set('Content-Type', 'application/json')
    body = JSON.stringify({ data: json, meta })
  }

  headers_.set(ORPC_TRANSFORMER_HEADER, '1')

  return { body, headers: headers_ }
}

export function findBlobs(
  data: unknown,
  path?: string[],
): { map: string[][]; blobs: Blob[] } {
  const path_ = path ?? []

  if (data instanceof Blob) {
    return { map: [path_], blobs: [data] }
  }

  const map: string[][] = []
  const blobs: Blob[] = []

  if (Array.isArray(data) || isPlainObject(data)) {
    for (const key in data) {
      const { map: map_, blobs: blobs_ } = findBlobs(data[key], [...path_, key])
      map.push(...map_)
      blobs.push(...blobs_)
    }
  }

  return { map, blobs }
}

export async function unpackFromRequestResponse(
  re: Request | Response,
): Promise<unknown> {
  const transformer = re.headers.get(ORPC_TRANSFORMER_HEADER)
  const contentType = re.headers.get('Content-Type')

  if (!contentType || contentType.startsWith('application/json')) {
    const text = await re.text()
    const json = safeParseJSON(text) as any

    if (transformer !== '1') {
      return json
    }

    return SuperJSON.deserialize({ json: json.data, meta: json.meta })
  }

  if (contentType.startsWith('text/plain')) {
    return await re.text()
  }

  if (contentType.startsWith('multipart/form-data')) {
    const form = await re.formData()

    if (transformer !== '1') {
      return Object.fromEntries(form.entries())
    }

    const data = safeParseJSON(form.get('data') as any) as any
    const meta = safeParseJSON(form.get('meta') as any) as any
    const blobsMap = safeParseJSON(form.get('blobsMap') as any) as any

    const dataRef = { value: SuperJSON.deserialize({ json: data, meta }) }

    for (const i in blobsMap) {
      const blob = form.get(i)
      if (!blob) continue
      set(dataRef, ['value', ...blobsMap[i]], blob)
    }

    return dataRef.value
  }

  return await re.blob()
}

export function safeParseJSON(text: string): unknown {
  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

export function set(obj: any, path: (string | number)[], value: any): void {
  const lastKey = path.pop()
  if (lastKey === undefined) return

  const target = path.reduce((acc, key) => {
    if (!(key in acc)) acc[key] = {}
    return acc[key]
  }, obj)

  target[lastKey] = value
}
