/**
 * OpenTelemetry tracing helpers for converting errors to span attributes.
 * Follows OpenTelemetry semantic conventions for error attributes.
 */

import type { DomainError } from '../errors/types.js'

/**
 * Convert a DomainError to OpenTelemetry span attributes.
 * Follows semantic conventions: https://opentelemetry.io/docs/specs/semconv/exceptions/
 *
 * @param error - The DomainError to convert
 * @returns Span attributes suitable for span.setAttributes()
 *
 * @example
 * import { trace } from '@opentelemetry/api'
 * import { toSpanAttributes } from '@jenova-marie/ts-rust-result/observability'
 *
 * const span = trace.getActiveSpan()
 * const result = fetchUser(userId)
 *
 * if (!result.ok) {
 *   span?.setAttributes(toSpanAttributes(result.error))
 *   span?.setStatus({ code: SpanStatusCode.ERROR })
 * }
 *
 * @example
 * // Attributes include:
 * // {
 * //   'error.kind': 'FileNotFound',
 * //   'error.message': 'File not found: /missing.txt',
 * //   'error.timestamp': 1234567890,
 * //   'error.context.path': '/missing.txt'
 * // }
 */
export function toSpanAttributes(
  error: DomainError
): Record<string, string | number | boolean> {
  const attrs: Record<string, string | number | boolean> = {
    'error.kind': error.kind,
    'error.message': error.message,
    'error.timestamp': error.timestamp || Date.now(),
  }

  // Add stack trace if present
  if (error.stack) {
    attrs['error.stack'] = error.stack
  }

  // Flatten context fields to error.context.* attributes
  if (error.context) {
    for (const [key, value] of Object.entries(error.context)) {
      const attrKey = `error.context.${key}`

      // Convert value to primitive
      if (typeof value === 'string') {
        attrs[attrKey] = value
      } else if (typeof value === 'number' || typeof value === 'boolean') {
        attrs[attrKey] = value
      } else if (value !== null && value !== undefined) {
        // Stringify complex values
        attrs[attrKey] = JSON.stringify(value)
      }
    }
  }

  return attrs
}

/**
 * Record an error event on a span (OpenTelemetry exception semantic convention).
 * Creates a span event with error details.
 *
 * @param span - OpenTelemetry span interface (from @opentelemetry/api)
 * @param error - The DomainError to record
 *
 * @example
 * import { trace } from '@opentelemetry/api'
 * import { recordErrorEvent } from '@jenova-marie/ts-rust-result/observability'
 *
 * const tracer = trace.getTracer('my-service')
 * const span = tracer.startSpan('loadConfig')
 *
 * const result = loadConfig()
 * if (!result.ok) {
 *   recordErrorEvent(span, result.error)
 * }
 *
 * span.end()
 */
export function recordErrorEvent(
  span: { addEvent: (name: string, attributes?: Record<string, unknown>) => void },
  error: DomainError
): void {
  span.addEvent('exception', {
    'exception.type': error.kind,
    'exception.message': error.message,
    'exception.stacktrace': error.stack,
    'exception.timestamp': error.timestamp,
  })
}

/**
 * Create a span event for error cause chains.
 * Useful for distributed tracing where errors propagate across services.
 *
 * @param span - OpenTelemetry span interface
 * @param error - The DomainError with cause chain
 * @param maxDepth - Maximum cause chain depth to record (default: 5)
 *
 * @example
 * import { trace } from '@opentelemetry/api'
 * import { recordErrorCauseChain } from '@jenova-marie/ts-rust-result/observability'
 *
 * const span = trace.getActiveSpan()
 * const result = processData()
 *
 * if (!result.ok) {
 *   // Records all errors in the cause chain as separate events
 *   recordErrorCauseChain(span, result.error)
 * }
 */
export function recordErrorCauseChain(
  span: { addEvent: (name: string, attributes?: Record<string, unknown>) => void },
  error: DomainError,
  maxDepth = 5
): void {
  let currentError: DomainError | unknown = error
  let depth = 0

  while (currentError && depth < maxDepth) {
    if (
      typeof currentError === 'object' &&
      currentError !== null &&
      'kind' in currentError &&
      'message' in currentError
    ) {
      const domainError = currentError as DomainError

      span.addEvent('exception', {
        'exception.type': domainError.kind,
        'exception.message': domainError.message,
        'exception.stacktrace': domainError.stack,
        'exception.depth': depth,
      })

      currentError = domainError.cause
    } else {
      // Non-DomainError cause
      span.addEvent('exception', {
        'exception.type': 'Unknown',
        'exception.message': String(currentError),
        'exception.depth': depth,
      })
      break
    }

    depth++
  }
}

/**
 * Convert error to OpenTelemetry semantic convention for HTTP errors.
 * Use for HTTP-related errors (NetworkError, HTTPError).
 *
 * @param error - The DomainError (should be HTTPError)
 * @returns HTTP-specific span attributes
 *
 * @example
 * import { toHTTPSpanAttributes } from '@jenova-marie/ts-rust-result/observability'
 *
 * const result = await fetchAPI('/users')
 * if (!result.ok && result.error.kind === 'HTTPError') {
 *   span?.setAttributes(toHTTPSpanAttributes(result.error))
 * }
 *
 * // Attributes:
 * // {
 * //   'http.status_code': 404,
 * //   'http.url': 'https://api.example.com/users',
 * //   'error.kind': 'HTTPError'
 * // }
 */
export function toHTTPSpanAttributes(
  error: DomainError & { kind: 'HTTPError'; url?: string; statusCode?: number; statusText?: string }
): Record<string, string | number | boolean> {
  const attrs: Record<string, string | number | boolean> = {
    'error.kind': error.kind,
    'error.message': error.message,
  }

  // Add HTTP-specific attributes following semantic conventions
  if (error.context) {
    if (typeof error.context.statusCode === 'number') {
      attrs['http.status_code'] = error.context.statusCode
    }
    if (typeof error.context.url === 'string') {
      attrs['http.url'] = error.context.url
    }
    if (typeof error.context.statusText === 'string') {
      attrs['http.status_text'] = error.context.statusText
    }
  }

  return attrs
}
