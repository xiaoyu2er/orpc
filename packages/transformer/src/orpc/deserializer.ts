import { set } from '@orpc/shared'
import type { Deserializer } from '../types'
import * as SuperJSON from './super-json'

export class ORPCDeserializer implements Deserializer {
  async deserialize(re: Request | Response): Promise<unknown> {
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
