import type { AnyContractProcedure } from '@orpc/contract'
import { applyDecorators, Delete, Get, Head, Patch, Post, Put, UseInterceptors } from '@nestjs/common'
import { fallbackContractConfig } from '@orpc/contract'
import { ImplementInterceptor } from './interceptor'
import { toFastifyPattern } from './utils'

export function Implement(contract: AnyContractProcedure): MethodDecorator {
  const method = fallbackContractConfig('defaultMethod', contract['~orpc'].route.method)
  const path = contract['~orpc'].route.path

  if (path === undefined) {
    throw new Error(`
      oRPC Fastify integration requires procedure to have a 'path'.
      Please define one using 'path' property on the '.route' method.
    `)
  }

  return (target, propertyKey, descriptor) => {
    const MethodDecorator = method === 'GET'
      ? Get
      : method === 'HEAD'
        ? Head
        : method === 'PUT'
          ? Put
          : method === 'PATCH'
            ? Patch
            : method === 'DELETE'
              ? Delete
              : Post

    applyDecorators(
      MethodDecorator(toFastifyPattern(path)),
      UseInterceptors(ImplementInterceptor),
    )(target, propertyKey, descriptor)
  }
}
