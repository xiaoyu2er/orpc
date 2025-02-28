import type { ORPCError } from '@orpc/client'
import type { StandardBody, StandardRequest, StandardResponse } from '@orpc/standard-server'
import type { AnyProcedure } from '../../procedure'
import type { StandardCodec, StandardParams } from './types'
import { RPCSerializer } from '@orpc/client/rpc'
import { parseEmptyableJSON } from '@orpc/shared'

export interface StandardCodecOptions {
  serializer?: RPCSerializer
}

export class RPCCodec implements StandardCodec {
  private readonly serializer: RPCSerializer

  constructor(
    options: StandardCodecOptions = {},
  ) {
    this.serializer = options.serializer ?? new RPCSerializer()
  }

  async decode(request: StandardRequest, _params: StandardParams | undefined, _procedure: AnyProcedure): Promise<unknown> {
    const serialized = request.method === 'GET'
      ? parseEmptyableJSON(request.url.searchParams.getAll('data').at(-1) as any) // this prevent duplicate data params
      : await request.body() as any

    return this.serializer.deserialize(serialized)
  }

  encode(output: unknown, _procedure: AnyProcedure): StandardResponse {
    return {
      status: 200,
      headers: {},
      body: this.serializer.serialize(output) as StandardBody,
    }
  }

  encodeError(error: ORPCError<any, any>): StandardResponse {
    return {
      status: error.status,
      headers: {},
      body: this.serializer.serialize(error.toJSON()) as StandardBody,
    }
  }
}
