import { findDeepMatches, set } from '@orpc/shared'
import { ORPCError } from '@orpc/shared/error'
import * as SuperJSON from './super-json'

export class ORPCPayloadCodec {
  encode(payload: unknown): { body: FormData | string, headers?: Headers } {
    const { data, meta } = SuperJSON.serialize(payload)
    const { maps, values } = findDeepMatches(v => v instanceof Blob, data)

    if (values.length > 0) {
      const form = new FormData()

      if (data !== undefined) {
        form.append('data', JSON.stringify(data))
      }

      form.append('meta', JSON.stringify(meta))
      form.append('maps', JSON.stringify(maps))

      for (const i in values) {
        const value = values[i]! as Blob
        form.append(i, value)
      }

      return { body: form }
    }

    return {
      body: JSON.stringify({ data, meta }),
      headers: new Headers({
        'content-type': 'application/json',
      }),
    }
  }

  async decode(re: Request | Response): Promise<unknown> {
    try {
      if (re.headers.get('content-type')?.startsWith('multipart/form-data')) {
        const form = await re.formData()

        // Since form-data only used when has file, so the data cannot be null
        const rawData = form.get('data') as string
        const rawMeta = form.get('meta') as string
        const rawMaps = form.get('maps') as string

        let data = JSON.parse(rawData)
        const meta = JSON.parse(rawMeta) as SuperJSON.JSONMeta
        const maps = JSON.parse(rawMaps) as (string | number)[][]

        for (const i in maps) {
          data = set(data, maps[i]!, form.get(i))
        }

        return SuperJSON.deserialize({
          data,
          meta,
        })
      }

      const json = await re.json()

      return SuperJSON.deserialize(json)
    }
    catch (e) {
      throw new ORPCError({
        code: 'BAD_REQUEST',
        message: 'Cannot parse request/response. Please check the request/response body and Content-Type header.',
        cause: e,
      })
    }
  }
}

export type PublicORPCPayloadCodec = Pick<ORPCPayloadCodec, keyof ORPCPayloadCodec>
