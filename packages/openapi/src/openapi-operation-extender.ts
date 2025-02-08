import type { AnyContractProcedure } from '@orpc/contract'
import type { OpenAPI } from './openapi'
import { isProcedure } from '@orpc/server'

const OPERATION_EXTENDER_SYMBOL = Symbol('ORPC_OPERATION_EXTENDER')

export type OverrideOperationValue = OpenAPI.OperationObject
  | ((current: OpenAPI.OperationObject, procedure: AnyContractProcedure) => OpenAPI.OperationObject)

export function setOperationExtender<T extends object>(o: T, extend: OverrideOperationValue): T {
  return new Proxy(o, {
    get(target, prop, receiver) {
      if (prop === OPERATION_EXTENDER_SYMBOL) {
        return extend
      }

      return Reflect.get(target, prop, receiver)
    },
  })
}

export function getOperationExtender(o: object): OverrideOperationValue | undefined {
  return (o as any)[OPERATION_EXTENDER_SYMBOL] as OverrideOperationValue
}

export function extendOperation(operation: OpenAPI.OperationObject, procedure: AnyContractProcedure): OpenAPI.OperationObject {
  const operationExtenders: OverrideOperationValue[] = []

  for (const errorItem of Object.values(procedure['~orpc'].errorMap)) {
    const maybeExtender = getOperationExtender(errorItem as any)

    if (maybeExtender) {
      operationExtenders.push(maybeExtender)
    }
  }

  if (isProcedure(procedure)) {
    for (const middleware of procedure['~orpc'].middlewares) {
      const maybeExtender = getOperationExtender(middleware)

      if (maybeExtender) {
        operationExtenders.push(maybeExtender)
      }
    }
  }

  let currentOperation = operation

  for (const extender of operationExtenders) {
    if (typeof extender === 'function') {
      currentOperation = extender(currentOperation, procedure)
    }
    else {
      currentOperation = {
        ...currentOperation,
        ...extender,
      }
    }
  }

  return currentOperation
}
