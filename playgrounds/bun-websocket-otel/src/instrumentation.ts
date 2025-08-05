import { NodeSDK } from '@opentelemetry/sdk-node'
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-node'
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node'
import { ORPCInstrumentation } from '@orpc/otel'
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http'
import { OTEL_TRACE_EXPORTER_URL } from './consts'
import { resourceFromAttributes } from '@opentelemetry/resources'

const traceExporter = new OTLPTraceExporter({
  url: OTEL_TRACE_EXPORTER_URL,
})

const sdk = new NodeSDK({
  resource: resourceFromAttributes({
    'service.name': 'bun-websocket-otel-playground-server',
  }),
  spanProcessors: [
    new BatchSpanProcessor(traceExporter),
  ],
  instrumentations: [
    getNodeAutoInstrumentations(),
    new ORPCInstrumentation(),
  ],
})

sdk.start()
