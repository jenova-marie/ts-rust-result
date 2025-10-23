# OpenTelemetry Integration Guide

Complete guide for integrating ts-rust-result with OpenTelemetry distributed tracing.

## Table of Contents

- [Quick Start](#quick-start)
- [Setup](#setup)
- [Span Attributes](#span-attributes)
- [Error Events](#error-events)
- [Error Cause Chains](#error-cause-chains)
- [Best Practices](#best-practices)
- [Examples](#examples)

---

## Quick Start

```typescript
import { trace } from '@opentelemetry/api'
import { toSpanAttributes } from '@jenova-marie/ts-rust-result/observability'

const span = trace.getActiveSpan()
const result = performOperation()

if (!result.ok) {
  // Add error attributes to span
  span?.setAttributes(toSpanAttributes(result.error))
  span?.setStatus({ code: SpanStatusCode.ERROR })
}
```

---

## Setup

### Installation

```bash
npm install @opentelemetry/api @opentelemetry/sdk-node @opentelemetry/auto-instrumentations-node
# or
pnpm add @opentelemetry/api @opentelemetry/sdk-node @opentelemetry/auto-instrumentations-node
```

### Initialize OpenTelemetry

```typescript
import { NodeSDK } from '@opentelemetry/sdk-node'
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node'
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http'

const sdk = new NodeSDK({
  traceExporter: new OTLPTraceExporter({
    url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318/v1/traces'
  }),
  instrumentations: [getNodeAutoInstrumentations()]
})

sdk.start()
```

---

## Span Attributes

### toSpanAttributes()

Converts DomainError to OpenTelemetry span attributes following semantic conventions.

```typescript
import { toSpanAttributes } from '@jenova-marie/ts-rust-result/observability'

const error = fileNotFound('/missing.txt')
const attrs = toSpanAttributes(error)

// Result:
// {
//   'error.kind': 'FileNotFound',
//   'error.message': 'File not found: /missing.txt',
//   'error.timestamp': 1234567890,
//   'error.context.path': '/missing.txt',
//   'error.stack': '...' (if captured)
// }
```

### Adding to Active Span

```typescript
import { trace, SpanStatusCode } from '@opentelemetry/api'

function handleError(error: DomainError) {
  const span = trace.getActiveSpan()

  if (span) {
    // Add error attributes
    span.setAttributes(toSpanAttributes(error))

    // Mark span as error
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: error.message
    })
  }
}
```

---

## Error Events

### recordErrorEvent()

Records an error as a span event (follows OpenTelemetry exception semantic convention).

```typescript
import { recordErrorEvent } from '@jenova-marie/ts-rust-result/observability'

const span = trace.getActiveSpan()
const result = loadConfig()

if (!result.ok) {
  recordErrorEvent(span, result.error)
}

// Creates span event:
// {
//   name: 'exception',
//   attributes: {
//     'exception.type': 'FileNotFound',
//     'exception.message': 'File not found: /config.json',
//     'exception.stacktrace': '...',
//     'exception.timestamp': 1234567890
//   }
// }
```

### Manual Event Recording

```typescript
const span = trace.getActiveSpan()

span?.addEvent('exception', {
  'exception.type': error.kind,
  'exception.message': error.message,
  'exception.stacktrace': error.stack,
  'exception.timestamp': error.timestamp
})
```

---

## Error Cause Chains

### recordErrorCauseChain()

Records all errors in a cause chain as separate events.

```typescript
import { recordErrorCauseChain } from '@jenova-marie/ts-rust-result/observability'

// Multi-level error chain
const innerError = fileNotFound('/config.json')
const middleError = error('ConfigParseError')
  .withCause(innerError)
  .build()
const outerError = error('StartupFailed')
  .withCause(middleError)
  .build()

const span = trace.getActiveSpan()
recordErrorCauseChain(span, outerError)

// Creates 3 span events (one for each error in chain):
// Event 1: StartupFailed (depth: 0)
// Event 2: ConfigParseError (depth: 1)
// Event 3: FileNotFound (depth: 2)
```

### Distributed Error Propagation

```typescript
import { context, propagation } from '@opentelemetry/api'

async function serviceA() {
  const tracer = trace.getTracer('service-a')
  const span = tracer.startSpan('process_request')

  const result = await loadData()
  if (!result.ok) {
    // Record error in service A span
    recordErrorEvent(span, result.error)

    // Propagate error to service B with trace context
    const carrier = {}
    propagation.inject(context.active(), carrier)

    await serviceB(result.error, carrier)
  }

  span.end()
}

async function serviceB(error: DomainError, carrier: any) {
  const extractedContext = propagation.extract(context.active(), carrier)
  const tracer = trace.getTracer('service-b')

  return context.with(extractedContext, () => {
    const span = tracer.startSpan('handle_error')

    // Error appears in service B trace, linked to service A
    recordErrorEvent(span, error)

    span.end()
  })
}
```

---

## Best Practices

### 1. Set Span Status on Errors

```typescript
import { SpanStatusCode } from '@opentelemetry/api'

function processRequest() {
  const tracer = trace.getTracer('my-service')
  const span = tracer.startSpan('process_request')

  const result = performOperation()

  if (!result.ok) {
    const error = result.error as DomainError

    // ✅ GOOD: Set span status
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: error.message
    })

    // ✅ GOOD: Add error attributes
    span.setAttributes(toSpanAttributes(error))

    // ✅ GOOD: Record error event
    recordErrorEvent(span, error)
  } else {
    span.setStatus({ code: SpanStatusCode.OK })
  }

  span.end()
  return result
}
```

### 2. Use Semantic Attributes for HTTP

```typescript
import { toHTTPSpanAttributes } from '@jenova-marie/ts-rust-result/observability'

const result = await fetchAPI('/users')
if (!result.ok && result.error.kind === 'HTTPError') {
  const span = trace.getActiveSpan()

  // ✅ Uses semantic conventions for HTTP errors
  span?.setAttributes(toHTTPSpanAttributes(result.error))
  // {
  //   'http.status_code': 404,
  //   'http.url': 'https://api.example.com/users',
  //   'error.kind': 'HTTPError'
  // }
}
```

### 3. Context Enrichment

```typescript
function enrichSpanWithError(error: DomainError, extraContext?: Record<string, unknown>) {
  const span = trace.getActiveSpan()

  span?.setAttributes({
    ...toSpanAttributes(error),
    // Add operation-specific context
    'operation.name': extraContext?.operation,
    'user.id': extraContext?.userId,
    'request.id': extraContext?.requestId
  })
}
```

### 4. Don't Span Validation Errors

```typescript
function handleResult(result: Result<Data>) {
  if (!result.ok) {
    const error = result.error as DomainError

    // ✅ GOOD: Don't create spans for validation errors
    if (error.kind === 'ValidationError') {
      logger.warn({ error }, 'Validation failed')
      return
    }

    // Record unexpected errors in spans
    const span = trace.getActiveSpan()
    recordErrorEvent(span, error)
  }
}
```

---

## Examples

### Example 1: Express API with Tracing

```typescript
import express from 'express'
import { trace, SpanStatusCode } from '@opentelemetry/api'
import { toSpanAttributes, recordErrorEvent } from '@jenova-marie/ts-rust-result/observability'

const app = express()
const tracer = trace.getTracer('api-service')

app.get('/api/users/:id', async (req, res) => {
  const span = tracer.startSpan('get_user', {
    attributes: {
      'http.method': req.method,
      'http.route': req.route.path,
      'http.target': req.url
    }
  })

  const result = await loadUser(req.params.id)

  if (!result.ok) {
    const error = result.error as DomainError

    // Add error to span
    span.setAttributes(toSpanAttributes(error))
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: error.message
    })
    recordErrorEvent(span, error)

    // HTTP response
    span.setAttribute('http.status_code', error.kind === 'NotFound' ? 404 : 500)
    span.end()

    return res.status(error.kind === 'NotFound' ? 404 : 500).json({
      error: error.message
    })
  }

  span.setStatus({ code: SpanStatusCode.OK })
  span.setAttribute('http.status_code', 200)
  span.end()

  res.json(result.value)
})
```

### Example 2: Database Operations

```typescript
import { trace, SpanStatusCode } from '@opentelemetry/api'
import { toSpanAttributes } from '@jenova-marie/ts-rust-result/observability'

async function queryDatabase(sql: string): Promise<Result<Row[]>> {
  const tracer = trace.getTracer('database')
  const span = tracer.startSpan('db.query', {
    attributes: {
      'db.system': 'postgresql',
      'db.statement': sql
    }
  })

  const result = await tryResultSafe(async () => {
    return await pool.query(sql)
  })

  if (!result.ok) {
    span.setAttributes(toSpanAttributes(result.error))
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: 'Database query failed'
    })
  } else {
    span.setStatus({ code: SpanStatusCode.OK })
    span.setAttribute('db.rows_affected', result.value.length)
  }

  span.end()
  return result
}
```

### Example 3: Microservice Communication

```typescript
import { trace, context, propagation, SpanKind } from '@opentelemetry/api'
import axios from 'axios'

async function callDownstreamService(data: Data): Promise<Result<Response>> {
  const tracer = trace.getTracer('service-a')
  const span = tracer.startSpan('call_service_b', {
    kind: SpanKind.CLIENT,
    attributes: {
      'peer.service': 'service-b',
      'http.method': 'POST',
      'http.url': 'http://service-b/api/process'
    }
  })

  return context.with(trace.setSpan(context.active(), span), async () => {
    try {
      // Inject trace context into HTTP headers
      const headers: Record<string, string> = {}
      propagation.inject(context.active(), headers)

      const result = await tryResultSafe(async () => {
        return await axios.post('http://service-b/api/process', data, { headers })
      })

      if (!result.ok) {
        span.setAttributes(toSpanAttributes(result.error))
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: 'Downstream service call failed'
        })
      } else {
        span.setStatus({ code: SpanStatusCode.OK })
      }

      span.end()
      return result
    } catch (e) {
      const error = fromError(e)
      span.setAttributes(toSpanAttributes(error))
      span.setStatus({ code: SpanStatusCode.ERROR })
      span.end()
      return err(error) // ✅ Fully typed in v2.1.0+
    }
  })
}
```

### Example 4: Background Job with Tracing

```typescript
import { trace, SpanStatusCode } from '@opentelemetry/api'
import { recordErrorCauseChain } from '@jenova-marie/ts-rust-result/observability'

async function processJob(job: Job) {
  const tracer = trace.getTracer('job-processor')
  const span = tracer.startSpan('process_job', {
    attributes: {
      'job.id': job.id,
      'job.type': job.type,
      'job.attempt': job.attempts
    }
  })

  const result = await tryResultSafe(() => job.execute())

  if (!result.ok) {
    const error = result.error

    // Record complete error chain
    recordErrorCauseChain(span, error)

    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: error.message
    })

    // Retry logic
    if (job.attempts < 3) {
      span.setAttribute('job.retry', true)
      await job.retry()
    } else {
      span.setAttribute('job.failed', true)
      await job.fail(error.message)
    }
  } else {
    span.setStatus({ code: SpanStatusCode.OK })
    span.setAttribute('job.success', true)
  }

  span.end()
}
```

### Example 5: Multi-Step Operation

```typescript
async function complexOperation(input: Input): Promise<Result<Output>> {
  const tracer = trace.getTracer('complex-op')
  const parentSpan = tracer.startSpan('complex_operation')

  return context.with(trace.setSpan(context.active(), parentSpan), async () => {
    // Step 1: Validate
    const validateSpan = tracer.startSpan('validate')
    const validationResult = validateInput(input)
    if (!validationResult.ok) {
      recordErrorEvent(validateSpan, validationResult.error)
      validateSpan.setStatus({ code: SpanStatusCode.ERROR })
      validateSpan.end()
      parentSpan.end()
      return validationResult
    }
    validateSpan.setStatus({ code: SpanStatusCode.OK })
    validateSpan.end()

    // Step 2: Load data
    const loadSpan = tracer.startSpan('load_data')
    const dataResult = await loadData(validationResult.value)
    if (!dataResult.ok) {
      recordErrorEvent(loadSpan, dataResult.error)
      loadSpan.setStatus({ code: SpanStatusCode.ERROR })
      loadSpan.end()
      parentSpan.end()
      return dataResult
    }
    loadSpan.setStatus({ code: SpanStatusCode.OK })
    loadSpan.end()

    // Step 3: Transform
    const transformSpan = tracer.startSpan('transform')
    const result = transformData(dataResult.value)
    if (!result.ok) {
      recordErrorEvent(transformSpan, result.error)
      transformSpan.setStatus({ code: SpanStatusCode.ERROR })
    } else {
      transformSpan.setStatus({ code: SpanStatusCode.OK })
    }
    transformSpan.end()
    parentSpan.end()

    return result
  })
}
```

---

## Viewing Traces

### Jaeger UI

1. Start Jaeger:
   ```bash
   docker run -d --name jaeger \
     -p 16686:16686 \
     -p 4318:4318 \
     jaegertracing/all-in-one:latest
   ```

2. View traces at http://localhost:16686

3. Search for errors:
   - Filter by `error.kind` tag
   - Look for spans with `status.code = ERROR`
   - Examine error events in span details

### Grafana Tempo

Configure Tempo as trace backend:

```typescript
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http'

const exporter = new OTLPTraceExporter({
  url: 'http://tempo:4318/v1/traces'
})
```

Query traces in Grafana:
```
{error.kind="FileNotFound"}
```

---

## Testing

### Mock OpenTelemetry in Tests

```typescript
import { jest } from '@jest/globals'

const mockSetAttributes = jest.fn()
const mockSetStatus = jest.fn()
const mockAddEvent = jest.fn()
const mockEnd = jest.fn()

jest.mock('@opentelemetry/api', () => ({
  trace: {
    getActiveSpan: () => ({
      setAttributes: mockSetAttributes,
      setStatus: mockSetStatus,
      addEvent: mockAddEvent,
      end: mockEnd
    }),
    getTracer: () => ({
      startSpan: () => ({
        setAttributes: mockSetAttributes,
        setStatus: mockSetStatus,
        addEvent: mockAddEvent,
        end: mockEnd
      })
    })
  }
}))

// Test
it('should add error attributes to span', () => {
  const error = fileNotFound('/missing.txt')
  handleError(error)

  expect(mockSetAttributes).toHaveBeenCalledWith(
    expect.objectContaining({
      'error.kind': 'FileNotFound',
      'error.message': expect.stringContaining('File not found')
    })
  )
})
```

---

## Troubleshooting

### Traces Not Appearing

1. **Check exporter URL**: Verify OTLP endpoint is correct
2. **Check sampling**: Ensure trace sampler is not dropping traces
3. **Check SDK initialization**: SDK must be initialized before app code
4. **Check context propagation**: Verify spans are in active context

### Missing Error Attributes

```typescript
// ✅ GOOD: Get active span first
const span = trace.getActiveSpan()
if (span) {
  span.setAttributes(toSpanAttributes(error))
}

// ❌ BAD: Assuming span exists
trace.getActiveSpan().setAttributes(toSpanAttributes(error)) // May throw
```

### Stack Traces Not in Spans

```typescript
// Force enable stack capture
import { setCaptureStacks } from '@jenova-marie/ts-rust-result/errors'
setCaptureStacks(true)
```

---

## Related Documentation

- [Error Design Philosophy](./ERROR_DESIGN.md)
- [Pattern Guide](./PATTERNS.md) - **New in v2.2.0** - Domain-specific helpers for clean error handling
- [Sentry Integration](./SENTRY.md)
- [Observability Guide](./README.md#observability)

---

## Resources

- [OpenTelemetry JavaScript SDK](https://opentelemetry.io/docs/instrumentation/js/)
- [OpenTelemetry Semantic Conventions](https://opentelemetry.io/docs/specs/otel/trace/semantic_conventions/)
- [Jaeger Documentation](https://www.jaegertracing.io/docs/)
- [Grafana Tempo Documentation](https://grafana.com/docs/tempo/latest/)
