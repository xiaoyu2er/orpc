import { context, trace } from '@opentelemetry/api'
import { setGlobalOtelConfig } from './packages/shared/src'

beforeAll(() => {
  setGlobalOtelConfig({
    tracer: trace.getTracer('orpc-test'),
    trace,
    context,
  })
})
