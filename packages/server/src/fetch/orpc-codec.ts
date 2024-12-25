import { findDeepMatches, set } from '@orpc/shared'
import * as SuperJSON from './super-json'

export class ORPCCodec {
  encode(payload: unknown): FormData | Blob | string | undefined {
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

      return form
    }

    const blob = new Blob([JSON.stringify({ data, meta })], {
      type: 'application/json',
    })

    return blob
  }

  async decode(re: Request | Response): Promise<unknown> {
    if (re.headers.get('Content-Type')?.startsWith('multipart/form-data')) {
      const form = await re.formData()

      const rawData = form.get('data') as null | string
      const rawMeta = form.get('meta') as string
      const rawMaps = form.get('maps') as string

      let data = rawData === null ? undefined : JSON.parse(rawData)
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
}
