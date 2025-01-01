import type { Params } from 'hono/router'
import { isPlainObject } from '@orpc/shared'

export class InputStructureCompact {
  build(params: Params, payload: unknown): unknown {
    if (Object.keys(params).length === 0) {
      return payload
    }

    if (!isPlainObject(payload)) {
      return params
    }

    return {
      ...params,
      ...payload,
    }
  }
}

export type PublicInputStructureCompact = Pick<InputStructureCompact, keyof InputStructureCompact>
