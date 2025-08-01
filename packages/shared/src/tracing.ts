/**
 * Only import types from @opentelemetry/api to avoid runtime dependencies.
 */
import type { AttributeValue, Exception, Span, SpanOptions, SpanStatusCode, Tracer } from '@opentelemetry/api'
import type { Promisable } from 'type-fest'
import { ORPC_SHARED_PACKAGE_NAME, ORPC_SHARED_PACKAGE_VERSION } from './consts'

const SPAN_ERROR_STATUS = 2 satisfies SpanStatusCode.ERROR // avoid runtime dependency on @opentelemetry/api

/**
 * We should use globalThis + a unique key to store global state.
 * If use a global variable/symbol, it can create multiple instances in different contexts.
 */
const TRACER_KEY = `__${ORPC_SHARED_PACKAGE_NAME}@${ORPC_SHARED_PACKAGE_VERSION}/tracer__`

/**
 * Sets the global OpenTelemetry tracer.
 * Call this once at app startup. Use `undefined` to disable tracing.
 */
export function setTracer(tracer: Tracer | undefined): void {
  (globalThis as any)[TRACER_KEY] = tracer
}

/**
 * Gets the global OpenTelemetry tracer.
 * Returns `undefined` if tracing is not enabled.
 */
export function getTracer(): Tracer | undefined {
  return (globalThis as any)[TRACER_KEY]
}

/**
 * Starts a new OpenTelemetry span with the given name and options.
 *
 * @returns The new span, or `undefined` if no tracer is set.
 */
export function startSpan(name: string, options: SpanOptions = {}): Span | undefined {
  const tracer = getTracer()
  return tracer?.startSpan(name, options)
}

/**
 * Runs a function within the context of a new OpenTelemetry span.
 * The span is ended automatically, and errors are recorded to the span.
 */
export async function runWithSpan<T>(
  name: string,
  fn: (span?: Span) => Promisable<T>,
  options: SpanOptions = {},
): Promise<T> {
  const tracer = getTracer()

  if (!tracer) {
    return fn()
  }

  return tracer.startActiveSpan(name, options, async (span) => {
    try {
      return await fn(span)
    }
    catch (e) {
      setSpanError(span, e)
      throw e
    }
    finally {
      span.end()
    }
  })
}

/**
 * Records and sets the error status on the given span.
 * If the span is `undefined`, it does nothing.
 */
export function setSpanError(span: Span | undefined, error: unknown): void {
  if (!span) {
    return
  }

  const exception = toOtelException(error)
  span.recordException(exception)
  span.setStatus({
    code: SPAN_ERROR_STATUS,
    message: exception.message,
  })
}

export function setSpanAttribute(span: Span | undefined, key: string, value: AttributeValue | undefined): void {
  if (!span || value === undefined) {
    return
  }

  span.setAttribute(key, value)
}

/**
 * Converts an error to an OpenTelemetry Exception.
 */
export function toOtelException(error: unknown): Exclude<Exception, string> {
  if (error instanceof Error) {
    const exception: Exclude<Exception, string> = {
      message: error.message,
      name: error.name,
      stack: error.stack,
    }

    if ('code' in error && (typeof error.code === 'string' || typeof error.code === 'number')) {
      exception.code = error.code
    }

    return exception
  }

  return { message: String(error) }
}

/**
 * Converts a value to a string suitable for OpenTelemetry span attributes.
 */
export function toSpanAttributeValue(data: unknown): string {
  if (data === undefined) {
    return 'undefined'
  }

  try {
    // eslint-disable-next-line ban/ban
    return JSON.stringify(data, (_, value) => {
      if (typeof value === 'bigint') {
        return value.toString()
      }

      if (value instanceof Map || value instanceof Set) {
        return Array.from(value)
      }

      return value
    })
  }
  catch {
    return String(data)
  }
}
