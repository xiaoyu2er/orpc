import type { CallHandler, ExecutionContext, NestInterceptor } from '@nestjs/common'
import type { StandardParams } from '@orpc/server/standard'
import type { StandardResponse } from '@orpc/standard-server'
import type { NodeHttpRequest, NodeHttpResponse } from '@orpc/standard-server-node'
import type { Request, Response } from 'express'
import type { FastifyReply, FastifyRequest } from 'fastify'
import type { Observable } from 'rxjs'
import { StandardBracketNotationSerializer, StandardOpenAPIJsonSerializer, StandardOpenAPISerializer } from '@orpc/openapi-client/standard'
import { StandardOpenAPICodec } from '@orpc/openapi/standard'
import { call, isProcedure, ORPCError, unlazy } from '@orpc/server'
import { sendStandardResponse, toStandardLazyRequest } from '@orpc/standard-server-node'
import { mergeMap } from 'rxjs'
import { toORPCError } from '../../client/src/error'

const codec = new StandardOpenAPICodec(
  new StandardOpenAPISerializer(
    new StandardOpenAPIJsonSerializer(),
    new StandardBracketNotationSerializer(),
  ),
)

type NestParams = Record<string, string | string[]>

export class ImplementInterceptor implements NestInterceptor {
  intercept(ctx: ExecutionContext, next: CallHandler<any>): Observable<any> {
    return next.handle().pipe(
      mergeMap(async (impl: unknown) => {
        const { default: procedure } = await unlazy(impl)

        if (!isProcedure(procedure)) {
          throw new Error(`
            The return value of the @Implement controller handler must be a corresponding implemented router or procedure.
          `)
        }

        const req: Request | FastifyRequest = ctx.switchToHttp().getRequest()
        const res: Response | FastifyReply = ctx.switchToHttp().getResponse()

        const nodeReq: NodeHttpRequest = 'raw' in req ? req.raw : req
        const nodeRes: NodeHttpResponse = 'raw' in res ? res.raw : res

        const standardRequest = toStandardLazyRequest(nodeReq, nodeRes)
        const fallbackStandardBody = standardRequest.body.bind(standardRequest)
        // Prefer NestJS parsed body (in nodejs body only allow parse once)
        standardRequest.body = () => Promise.resolve(req.body ?? fallbackStandardBody())

        const standardResponse: StandardResponse = await (async () => {
          let isDecoding = false

          try {
            // TODO: handle fastify params *
            isDecoding = true
            const input = await codec.decode(standardRequest, flattenParams(req.params as NestParams), procedure)
            isDecoding = false

            const output = await call(procedure, input)

            return codec.encode(output, procedure)
          }
          catch (e) {
            const error = isDecoding && !(e instanceof ORPCError)
              ? new ORPCError('BAD_REQUEST', {
                message: `Malformed request. Ensure the request body is properly formatted and the 'Content-Type' header is set correctly.`,
                cause: e,
              })
              : toORPCError(e)

            return codec.encodeError(error)
          }
        })()

        await sendStandardResponse(nodeRes, standardResponse)
      }),
    )
  }
}

function flattenParams(params: NestParams): StandardParams {
  const flatten: StandardParams = {}

  for (const [key, value] of Object.entries(params)) {
    if (Array.isArray(value)) {
      flatten[key] = value.join('/')
    }
    else {
      flatten[key] = value
    }
  }

  return flatten
}
