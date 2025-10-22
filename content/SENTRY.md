# Sentry Integration Guide

Complete guide for integrating ts-rust-result with Sentry error monitoring.

## Table of Contents

- [Quick Start](#quick-start)
- [Setup](#setup)
- [Converting Errors](#converting-errors)
- [Best Practices](#best-practices)
- [Advanced Usage](#advanced-usage)
- [Examples](#examples)

---

## Quick Start

```typescript
import * as Sentry from '@sentry/node'
import { toSentryError } from '@jenova-marie/ts-rust-result/errors'

const result = loadConfig()
if (!result.ok) {
  // Convert DomainError to Error instance for Sentry
  Sentry.captureException(toSentryError(result.error))
}
```

---

## Setup

### Installation

```bash
npm install @sentry/node
# or
pnpm add @sentry/node
```

### Initialize Sentry

```typescript
import * as Sentry from '@sentry/node'

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0,
})
```

---

## Converting Errors

### toSentryError()

Converts a `DomainError` to an `Error` instance that Sentry can process.

```typescript
import { toSentryError } from '@jenova-marie/ts-rust-result/errors'

const domainError = fileNotFound('/missing.txt')
const sentryError = toSentryError(domainError)

// Result:
// Error {
//   name: 'FileNotFound',
//   message: 'File not found: /missing.txt',
//   path: '/missing.txt',  // from context
//   stack: '...'
// }
```

### What Gets Converted

```typescript
{
  kind: 'FileNotFound',           // → error.name
  message: 'File not found: ...',  // → error.message
  stack: '...',                    // → error.stack
  context: { path: '...' }         // → error.path (flattened)
}
```

Context fields become properties on the Error object for Sentry breadcrumbs.

---

## Best Practices

### 1. Only Send Unexpected Errors

Don't send validation errors or expected business logic errors to Sentry.

```typescript
import { isUnexpectedError } from './utils'

function handleError(error: DomainError) {
  // ✅ GOOD: Filter out expected errors
  if (error.kind === 'ValidationError' || error.kind === 'NotFound') {
    // Log locally, don't send to Sentry
    logger.warn({ error }, 'Expected error occurred')
    return
  }

  // Send unexpected errors to Sentry
  Sentry.captureException(toSentryError(error))
}
```

### 2. Set Severity Levels

Map error kinds to Sentry severity levels:

```typescript
function getSentryLevel(error: DomainError): Sentry.SeverityLevel {
  switch (error.kind) {
    case 'DatabaseConnectionFailed':
    case 'AuthenticationFailed':
      return 'fatal'

    case 'FileNotFound':
    case 'NetworkError':
      return 'error'

    case 'ValidationError':
      return 'warning'

    default:
      return 'error'
  }
}

// Usage
Sentry.captureException(toSentryError(error), {
  level: getSentryLevel(error)
})
```

### 3. Add Custom Context

Enrich Sentry reports with additional context:

```typescript
function reportToSentry(error: DomainError, extra?: Record<string, unknown>) {
  Sentry.captureException(toSentryError(error), {
    level: getSentryLevel(error),
    extra: {
      error_kind: error.kind,
      error_timestamp: error.timestamp,
      ...error.context,
      ...extra
    },
    tags: {
      error_category: getCategoryFromKind(error.kind)
    }
  })
}

// Usage
reportToSentry(error, {
  user_id: userId,
  request_id: requestId,
  environment: process.env.NODE_ENV
})
```

### 4. Filter Sensitive Data

Remove sensitive information before sending to Sentry:

```typescript
import { toSentryError } from '@jenova-marie/ts-rust-result/errors'

function sanitizeError(error: DomainError): DomainError {
  const sanitized = { ...error }

  if (sanitized.context) {
    const { password, apiKey, token, ...safeContext } = sanitized.context
    sanitized.context = safeContext
  }

  return sanitized
}

// Usage
const sanitizedError = sanitizeError(error)
Sentry.captureException(toSentryError(sanitizedError))
```

---

## Advanced Usage

### Error Fingerprinting

Group similar errors together in Sentry:

```typescript
Sentry.captureException(toSentryError(error), {
  fingerprint: [
    error.kind,
    // Group by operation if available
    error.context?.operation as string,
    // Group by resource type if available
    error.context?.resourceType as string
  ].filter(Boolean)
})
```

### Error Chaining

Sentry will automatically capture error cause chains:

```typescript
const innerError = fileNotFound('/config.json')
const outerError = error('ConfigParseError')
  .withMessage('Failed to load config')
  .withCause(innerError)
  .build()

// toSentryError preserves the cause chain
Sentry.captureException(toSentryError(outerError))
// Sentry UI will show both errors
```

### Custom Sentry Integration

Create a reusable integration wrapper:

```typescript
import * as Sentry from '@sentry/node'
import { toSentryError, type DomainError } from '@jenova-marie/ts-rust-result/errors'

export class SentryReporter {
  private shouldReport(error: DomainError): boolean {
    // Don't report validation or expected errors
    const skipKinds = ['ValidationError', 'NotFound', 'Unauthorized']
    return !skipKinds.includes(error.kind)
  }

  private getSeverity(error: DomainError): Sentry.SeverityLevel {
    const fatalKinds = ['DatabaseConnectionFailed', 'StartupFailed']
    const warningKinds = ['DeprecatedFeatureUsed', 'ConfigMissing']

    if (fatalKinds.includes(error.kind)) return 'fatal'
    if (warningKinds.includes(error.kind)) return 'warning'
    return 'error'
  }

  report(error: DomainError, extra?: Record<string, unknown>): void {
    if (!this.shouldReport(error)) {
      return
    }

    Sentry.captureException(toSentryError(error), {
      level: this.getSeverity(error),
      extra: {
        error_kind: error.kind,
        error_timestamp: error.timestamp,
        ...error.context,
        ...extra
      },
      tags: {
        error_kind: error.kind
      }
    })
  }
}

// Usage
const reporter = new SentryReporter()
reporter.report(error, { user_id: userId })
```

---

## Examples

### Example 1: HTTP API Error Handling

```typescript
import express from 'express'
import * as Sentry from '@sentry/node'
import { toSentryError, type DomainError } from '@jenova-marie/ts-rust-result/errors'
import { toLogContext } from '@jenova-marie/ts-rust-result/observability'
import pino from 'pino'

const logger = pino()
const app = express()

app.get('/api/users/:id', async (req, res) => {
  const result = await loadUser(req.params.id)

  if (!result.ok) {
    const error = result.error as DomainError

    // Always log
    logger.error(toLogContext(error), 'Failed to load user')

    // Send to Sentry (filtered)
    if (error.kind !== 'NotFound') {
      Sentry.captureException(toSentryError(error), {
        extra: {
          user_id: req.params.id,
          request_id: req.headers['x-request-id']
        }
      })
    }

    // Send appropriate HTTP response
    if (error.kind === 'NotFound') {
      return res.status(404).json({ error: 'User not found' })
    }

    return res.status(500).json({ error: 'Internal server error' })
  }

  res.json(result.value)
})
```

### Example 2: Background Job Error Handling

```typescript
import * as Sentry from '@sentry/node'
import { toSentryError, fromError } from '@jenova-marie/ts-rust-result/errors'

async function processJob(job: Job) {
  const transaction = Sentry.startTransaction({
    name: 'process_job',
    op: 'job'
  })

  try {
    const result = await tryResultSafe(() => job.execute())

    if (!result.ok) {
      const error = result.error

      // Report to Sentry with job context
      Sentry.captureException(toSentryError(error), {
        level: 'error',
        extra: {
          job_id: job.id,
          job_type: job.type,
          job_attempts: job.attempts,
          error_kind: error.kind
        },
        tags: {
          job_type: job.type
        }
      })

      // Retry or fail job
      if (job.attempts < 3) {
        await job.retry()
      } else {
        await job.fail(error.message)
      }
    }
  } finally {
    transaction.finish()
  }
}
```

### Example 3: Global Error Handler

```typescript
import * as Sentry from '@sentry/node'
import { fromError, toSentryError } from '@jenova-marie/ts-rust-result/errors'

// Global uncaught exception handler
process.on('uncaughtException', (err) => {
  const domainError = fromError(err)

  console.error('Uncaught exception:', domainError)

  Sentry.captureException(toSentryError(domainError), {
    level: 'fatal',
    extra: {
      error_kind: domainError.kind,
      stack: domainError.stack
    }
  })

  // Give Sentry time to send the event
  setTimeout(() => {
    process.exit(1)
  }, 1000)
})

// Global unhandled rejection handler
process.on('unhandledRejection', (reason) => {
  const domainError = fromError(reason)

  console.error('Unhandled rejection:', domainError)

  Sentry.captureException(toSentryError(domainError), {
    level: 'error',
    extra: {
      error_kind: domainError.kind
    }
  })
})
```

### Example 4: With Express Error Middleware

```typescript
import express from 'express'
import * as Sentry from '@sentry/node'
import { toSentryError, fromError } from '@jenova-marie/ts-rust-result/errors'

const app = express()

// Sentry request handler (must be first)
app.use(Sentry.Handlers.requestHandler())

// Your routes
app.get('/api/data', async (req, res, next) => {
  const result = await fetchData()
  if (!result.ok) {
    return next(result.error) // Pass to error handler
  }
  res.json(result.value)
})

// Sentry error handler (must be before other error handlers)
app.use(Sentry.Handlers.errorHandler())

// Custom error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  // Convert to DomainError if not already
  const domainError = err.kind ? err : fromError(err)

  // Send to Sentry (already done by Sentry.Handlers.errorHandler())
  // But you can add extra context here if needed
  Sentry.getCurrentHub().captureException(toSentryError(domainError), {
    extra: {
      path: req.path,
      method: req.method,
      user_agent: req.headers['user-agent']
    }
  })

  res.status(500).json({
    error: 'Internal server error',
    message: domainError.message
  })
})
```

---

## Testing Sentry Integration

### Test in Development

```typescript
import * as Sentry from '@sentry/node'

// Initialize Sentry with debug mode
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: 'development',
  debug: true, // Enable debug logging
  beforeSend(event) {
    console.log('Sentry event:', event)
    return event
  }
})

// Test sending an error
const testError = fileNotFound('/test.txt')
Sentry.captureException(toSentryError(testError))

// Check Sentry dashboard for the error
```

### Mock Sentry in Tests

```typescript
import { jest } from '@jest/globals'

// Mock Sentry in tests
jest.mock('@sentry/node', () => ({
  captureException: jest.fn(),
  captureMessage: jest.fn(),
  init: jest.fn()
}))

// Test error reporting
it('should report errors to Sentry', () => {
  const error = fileNotFound('/missing.txt')
  reportToSentry(error)

  expect(Sentry.captureException).toHaveBeenCalledWith(
    expect.objectContaining({
      name: 'FileNotFound',
      message: expect.stringContaining('File not found')
    }),
    expect.any(Object)
  )
})
```

---

## Troubleshooting

### Errors Not Appearing in Sentry

1. **Check DSN**: Ensure `SENTRY_DSN` is set correctly
2. **Check beforeSend**: Make sure `beforeSend` hook isn't filtering errors
3. **Check network**: Verify app can reach Sentry servers
4. **Check error count**: Sentry has rate limits

### Stack Traces Not Showing

```typescript
// Ensure stack traces are captured
import { setCaptureStacks } from '@jenova-marie/ts-rust-result/errors'

setCaptureStacks(true) // Force enable in production for debugging
```

### Sensitive Data Leaking

```typescript
// Use Sentry's beforeSend to scrub data
Sentry.init({
  beforeSend(event) {
    // Remove sensitive data from extra context
    if (event.extra) {
      delete event.extra.password
      delete event.extra.apiKey
      delete event.extra.token
    }
    return event
  }
})
```

---

## Related Documentation

- [Error Design Philosophy](./ERROR_DESIGN.md)
- [OpenTelemetry Integration](./OPENTELEMETRY.md)
- [Observability Guide](./README.md#observability)

---

## Resources

- [Sentry Node.js SDK](https://docs.sentry.io/platforms/node/)
- [Sentry Error Tracking](https://docs.sentry.io/product/issues/)
- [Sentry Best Practices](https://docs.sentry.io/platforms/node/best-practices/)
