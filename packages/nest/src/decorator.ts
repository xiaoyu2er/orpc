import type { ContractRouter } from '@orpc/contract'
import type { Router } from '@orpc/server'
import type { Promisable } from '@orpc/shared'
import { applyDecorators, Delete, Get, Head, Patch, Post, Put, UseInterceptors } from '@nestjs/common'
import { fallbackContractConfig, isContractProcedure } from '@orpc/contract'
import { getRouter } from '@orpc/server'
import { get } from '@orpc/shared'
import { ImplementInterceptor } from './interceptor'
import { toNestPattern } from './utils'

export function Implement<T extends ContractRouter<any>>(
  contract: T,
): <U extends Promisable<Router<T, Record<never, never>>>>(
    target: Record<PropertyKey, any>,
    propertyKey: string,
    descriptor: TypedPropertyDescriptor<(...args: any[]) => U>
  ) => void {
  if (isContractProcedure(contract)) {
    const method = fallbackContractConfig('defaultMethod', contract['~orpc'].route.method)
    const path = contract['~orpc'].route.path

    if (path === undefined) {
      throw new Error(`
        @Implement decorator requires contract to have a 'path'.
        Please define one using 'path' property on the '.route' method.
        Or use "populateContractRouterPaths" utility to automatically fill in any missing paths.
      `)
    }

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

    return (target, propertyKey, descriptor) => {
      applyDecorators(
        MethodDecorator(toNestPattern(path)),
        UseInterceptors(ImplementInterceptor),
      )(target, propertyKey, descriptor)
    }
  }

  return (target, propertyKey, descriptor) => {
    for (const key in contract) {
      let methodName = `${propertyKey}_${key}`

      let i = 0
      while (methodName in target) {
        methodName = `${propertyKey}_${key}_${i++}`
      }

      target[methodName] = async function (...args: any[]) {
        const router = await descriptor.value!.apply(this, args)
        return getRouter(router, [key])
      }

      for (const p of Reflect.getOwnMetadataKeys(target, propertyKey)) {
        Reflect.defineMetadata(p, Reflect.getOwnMetadata(p, target, propertyKey), target, methodName)
      }

      for (const p of Reflect.getOwnMetadataKeys(target.constructor, propertyKey)) {
        Reflect.defineMetadata(p, Reflect.getOwnMetadata(p, target.constructor, propertyKey), target.constructor, methodName)
      }

      Implement(get(contract, [key]) as any)(target, methodName, Object.getOwnPropertyDescriptor(target, methodName)!)
    }
  }
}
