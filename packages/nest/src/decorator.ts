import type { AnyContractProcedure } from '@orpc/contract'
import type { Router } from '@orpc/server'
import { applyDecorators, Delete, Get, Head, Patch, Post, Put, UseInterceptors } from '@nestjs/common'
import { fallbackContractConfig } from '@orpc/contract'
import { ImplementInterceptor } from './interceptor'
import { toNestPattern } from './utils'

export function Implement<T extends AnyContractProcedure>(
  contract: T,
): <U extends Router<T, Record<never, never>>>(
    target: object,
    propertyKey: string | symbol,
    descriptor: TypedPropertyDescriptor<(...args: any[]) => U>
  ) => void {
  const method = fallbackContractConfig('defaultMethod', contract['~orpc'].route.method)
  const path = contract['~orpc'].route.path

  if (path === undefined) {
    throw new Error(`
      oRPC NestJS integration requires procedure to have a 'path'.
      Please define one using 'path' property on the '.route' method.
      Or use "populateContractRouterPaths" utility to automatically fill in any missing paths.
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
      MethodDecorator(toNestPattern(path)),
      UseInterceptors(ImplementInterceptor),
    )(target, propertyKey, descriptor)
  }
}
