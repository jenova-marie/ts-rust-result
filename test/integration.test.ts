/**
 * Integration tests for ts-rust-result 2.0.0
 * Tests all three import paths and their interoperability
 */

import { describe, it, expect } from 'vitest'

// Test 1: Main package imports
import { ok, err, isOk, isErr, type Result } from '../src/index'

// Test 2: Error infrastructure imports
import {
  error,
  fileNotFound,
  invalidJSON,
  schemaValidation,
  connectionFailed,
  databaseConnectionFailed,
  unauthorized,
  missingConfig,
  fromError,
  toSentryError,
  tryResultSafe,
  tryResultSafeSync,
  fromZodSafeParse,
  setCaptureStacks,
  getCaptureStacks,
  type DomainError,
  type FileSystemError,
  type ValidationError,
  type NetworkError,
} from '../src/errors'

// Test 3: Observability imports
import {
  toLogContext,
  toFlatLogContext,
  toSpanAttributes,
  toMetricLabels,
  toMetricLabelsWithContext,
  recordErrorEvent,
} from '../src/observability'

describe('Integration: Package Imports', () => {
  it('should import core Result types from main package', () => {
    const result = ok(42)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value).toBe(42)
    }

    const errorResult = err(new Error('test'))
    expect(errorResult.ok).toBe(false)
  })

  it('should import error infrastructure from /errors subpath', () => {
    const e = fileNotFound('/missing.txt')
    expect(e.kind).toBe('FileNotFound')
    expect(e.message).toContain('/missing.txt')
  })

  it('should import observability helpers from /observability subpath', () => {
    const e = fileNotFound('/missing.txt')
    const logContext = toLogContext(e)
    expect(logContext.error_kind).toBe('FileNotFound')
    expect(logContext.error_message).toContain('/missing.txt')
  })
})

describe('Integration: Builder Pattern', () => {
  it('should build errors with fluent API', () => {
    const e = error('CustomError')
      .withMessage('Something went wrong')
      .withContext({ userId: 123, operation: 'delete' })
      .build()

    expect(e.kind).toBe('CustomError')
    expect(e.message).toBe('Something went wrong')
    expect(e.context).toEqual({ userId: 123, operation: 'delete' })
    expect(e.timestamp).toBeDefined()
  })

  it('should capture stack traces in test environment', () => {
    const e = error('TestError')
      .withMessage('Test error')
      .captureStack()
      .build()

    expect(e.stack).toBeDefined()
    expect(e.stack).toContain('at ')
  })

  it('should skip stack traces when requested', () => {
    const e = error('ValidationError')
      .withMessage('Invalid input')
      .skipStack()
      .build()

    expect(e.stack).toBeUndefined()
  })

  it('should support error chaining with cause', () => {
    const innerError = fileNotFound('/inner.txt')
    const outerError = error('ConfigParseError')
      .withMessage('Failed to parse config')
      .withCause(innerError)
      .build()

    expect(outerError.cause).toBe(innerError)
  })
})

describe('Integration: Factory Functions', () => {
  it('should create FileSystemError types', () => {
    const e1 = fileNotFound('/path/to/file.txt')
    expect(e1.kind).toBe('FileNotFound')

    const e1Typed: FileSystemError = e1
    expect(e1Typed.kind).toBe('FileNotFound')
  })

  it('should create ParseError types', () => {
    const e = invalidJSON('{"bad": json}', 'Unexpected token')
    expect(e.kind).toBe('InvalidJSON')
    expect(e.message).toContain('Invalid JSON')
  })

  it('should create ValidationError types', () => {
    const issues = [
      { path: ['user', 'email'], message: 'Invalid email' },
      { path: ['user', 'age'], message: 'Must be at least 18' },
    ]
    const e = schemaValidation(issues)
    expect(e.kind).toBe('SchemaValidation')
    expect(e.message).toContain('2 issue(s)')
    expect(e.stack).toBeUndefined() // Validation errors skip stacks
  })

  it('should create NetworkError types', () => {
    const e = connectionFailed('https://api.example.com', 'ECONNREFUSED')
    expect(e.kind).toBe('ConnectionFailed')
    expect(e.message).toContain('api.example.com')

    const e2Typed: NetworkError = e
    expect(e2Typed.kind).toBe('ConnectionFailed')
  })

  it('should create DatabaseError types', () => {
    const e = databaseConnectionFailed('postgres://localhost/mydb', 'Connection refused')
    expect(e.kind).toBe('DatabaseConnectionFailed')
    expect(e.message).toContain('postgres://localhost/mydb')
  })

  it('should create AuthError types', () => {
    const e = unauthorized('/admin/users', 'admin:write')
    expect(e.kind).toBe('Unauthorized')
    expect(e.message).toContain('admin:write')
  })

  it('should create ConfigError types', () => {
    const e = missingConfig('DATABASE_URL')
    expect(e.kind).toBe('MissingConfig')
    expect(e.message).toContain('DATABASE_URL')
  })
})

describe('Integration: Error Conversion', () => {
  it('should convert Error instances to UnexpectedError', () => {
    const originalError = new Error('Something broke')
    const domainError = fromError(originalError)

    expect(domainError.kind).toBe('Unexpected')
    expect(domainError.message).toBe('Something broke')
    expect(domainError.context?.originalError).toBe(originalError)
  })

  it('should convert non-Error values to UnexpectedError', () => {
    const domainError = fromError('string error')
    expect(domainError.kind).toBe('Unexpected')
    expect(domainError.message).toBe('string error')
  })

  it('should convert DomainError to Sentry Error', () => {
    const domainError = fileNotFound('/missing.txt')
    const sentryError = toSentryError(domainError)

    expect(sentryError).toBeInstanceOf(Error)
    expect(sentryError.name).toBe('FileNotFound')
    expect(sentryError.message).toContain('/missing.txt')
  })

  it('should wrap async functions with tryResultSafe', async () => {
    const successFn = async () => 42
    const result = await tryResultSafe(successFn)

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value).toBe(42)
    }
  })

  it('should catch throws in tryResultSafe', async () => {
    const failFn = async () => {
      throw new Error('Async failure')
    }
    const result = await tryResultSafe(failFn)

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toBeDefined()
    }
  })

  it('should wrap sync functions with tryResultSafeSync', () => {
    const successFn = () => 42
    const result = tryResultSafeSync(successFn)

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value).toBe(42)
    }
  })

  it('should catch throws in tryResultSafeSync', () => {
    const failFn = () => {
      throw new Error('Sync failure')
    }
    const result = tryResultSafeSync(failFn)

    expect(result.ok).toBe(false)
  })
})

describe('Integration: Stack Capture Configuration', () => {
  it('should respect global stack capture override', () => {
    // Force enable stacks
    setCaptureStacks(true)
    const e1 = error('Test').withMessage('Test').build()
    expect(e1.stack).toBeDefined()

    // Force disable stacks
    setCaptureStacks(false)
    const e2 = error('Test').withMessage('Test').build()
    expect(e2.stack).toBeUndefined()

    // Reset to NODE_ENV behavior
    setCaptureStacks(undefined)
    const e3 = error('Test').withMessage('Test').build()
    // In test environment, stacks should be captured
    expect(e3.stack).toBeDefined()
  })

  it('should allow per-error stack override', () => {
    setCaptureStacks(false) // Globally disable

    // Force capture for this error only
    const e1 = error('Critical').withMessage('Critical error').captureStack().build()
    expect(e1.stack).toBeDefined()

    // Respect global setting
    const e2 = error('Normal').withMessage('Normal error').build()
    expect(e2.stack).toBeUndefined()

    setCaptureStacks(undefined) // Reset
  })
})

describe('Integration: Observability Helpers', () => {
  const testError = error('TestError')
    .withMessage('Test error message')
    .withContext({ userId: 123, operation: 'test' })
    .build()

  it('should convert to log context', () => {
    const logContext = toLogContext(testError)

    expect(logContext.error_kind).toBe('TestError')
    expect(logContext.error_message).toBe('Test error message')
    expect(logContext.error_context).toEqual({ userId: 123, operation: 'test' })
    expect(logContext.error_timestamp).toBeDefined()
  })

  it('should convert to flat log context', () => {
    const flatContext = toFlatLogContext(testError)

    expect(flatContext.error_kind).toBe('TestError')
    expect(flatContext.error_message).toBe('Test error message')
    expect(flatContext.error_context_userId).toBe(123) // Number stays as number
    expect(flatContext.error_context_operation).toBe('test')
  })

  it('should convert to span attributes', () => {
    const spanAttrs = toSpanAttributes(testError)

    expect(spanAttrs['error.kind']).toBe('TestError')
    expect(spanAttrs['error.message']).toBe('Test error message')
    expect(spanAttrs['error.context.userId']).toBe(123) // Number stays as number
    expect(spanAttrs['error.context.operation']).toBe('test')
  })

  it('should convert to metric labels', () => {
    const labels = toMetricLabels(testError)

    expect(labels.error_kind).toBe('TestError')
    // Should only include error_kind by default (prevent cardinality explosion)
    expect(Object.keys(labels)).toHaveLength(1)
  })

  it('should convert to metric labels with whitelisted context', () => {
    const labels = toMetricLabelsWithContext(testError, ['operation'])

    expect(labels.error_kind).toBe('TestError')
    expect(labels.operation).toBe('test')
    // Should not include userId (not whitelisted)
    expect(labels.userId).toBeUndefined()
  })

  it('should handle error cause chains in log context', () => {
    const innerError = fileNotFound('/inner.txt')
    const outerError = error('OuterError')
      .withMessage('Outer error')
      .withCause(innerError)
      .build()

    const logContext = toLogContext(outerError)

    expect(logContext.error_kind).toBe('OuterError')
    expect(logContext.error_cause).toBeDefined()
    const cause = logContext.error_cause as Record<string, unknown>
    expect(cause.error_kind).toBe('FileNotFound')
  })

  it('should record error events on spans', () => {
    const events: Array<{ name: string; attributes?: Record<string, unknown> }> = []
    const mockSpan = {
      addEvent: (name: string, attributes?: Record<string, unknown>) => {
        events.push({ name, attributes })
      },
    }

    recordErrorEvent(mockSpan, testError)

    expect(events).toHaveLength(1)
    expect(events[0].name).toBe('exception')
    expect(events[0].attributes?.['exception.type']).toBe('TestError')
    expect(events[0].attributes?.['exception.message']).toBe('Test error message')
  })
})

describe('Integration: Result + DomainError Workflow', () => {
  // Simulate a real-world function using the new error types
  function loadUserConfig(userId: number): Result<{ name: string; email: string }> {
    if (userId < 0) {
      return err(invalidJSON('user config', 'Invalid user ID'))
    }

    if (userId === 0) {
      return err(fileNotFound(`/users/${userId}/config.json`))
    }

    return ok({ name: 'Test User', email: 'test@example.com' })
  }

  it('should work with Result type and domain errors', () => {
    const result1 = loadUserConfig(1)
    expect(result1.ok).toBe(true)

    const result2 = loadUserConfig(0)
    expect(result2.ok).toBe(false)
    if (!result2.ok) {
      // Can't access error.kind directly due to type mismatch
      // This is a known limitation - we're using DomainError but Result expects Error
      expect(result2.error).toBeDefined()
    }

    const result3 = loadUserConfig(-1)
    expect(result3.ok).toBe(false)
  })

  it('should compose with observability helpers', () => {
    const result = loadUserConfig(0)

    if (!result.ok) {
      // Convert to log context for structured logging
      const logContext = toLogContext(result.error as any)
      expect(logContext.error_kind).toBe('FileNotFound')

      // Convert to Sentry error for error monitoring
      const sentryError = toSentryError(result.error as any)
      expect(sentryError.name).toBe('FileNotFound')

      // Convert to metric labels for Prometheus
      const metricLabels = toMetricLabels(result.error as any)
      expect(metricLabels.error_kind).toBe('FileNotFound')
    }
  })
})

describe('Integration: Zod Integration', () => {
  it('should convert Zod success to ok Result', () => {
    const zodResult = {
      success: true as const,
      data: { name: 'Test', email: 'test@example.com' },
    }

    const result = fromZodSafeParse(zodResult)

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value).toEqual({ name: 'Test', email: 'test@example.com' })
    }
  })

  it('should convert Zod failure to ValidationError Result', () => {
    const zodResult = {
      success: false as const,
      error: {
        errors: [
          { path: ['name'], message: 'Required', code: 'required' },
          { path: ['email'], message: 'Invalid email', code: 'invalid_string' },
        ],
      },
    }

    const result = fromZodSafeParse(zodResult)

    expect(result.ok).toBe(false)
    if (!result.ok) {
      // Type mismatch - Result expects Error, but we're using DomainError
      const error = result.error as any
      expect(error.kind).toBe('SchemaValidation')
      expect(error.context.issues).toHaveLength(2)
    }
  })
})

describe('Integration: Real-World Scenario', () => {
  // Simulate a complete workflow: file reading with error handling and observability

  async function readConfigFile(path: string): Promise<Result<Record<string, unknown>>> {
    // Simulate file system check
    if (!path || path === '') {
      return err(invalidJSON(path, 'Empty path') as any)
    }

    if (path === '/missing.json') {
      return err(fileNotFound(path) as any)
    }

    if (path === '/invalid.json') {
      return err(invalidJSON('{"bad": json}', 'Unexpected token j') as any)
    }

    // Success case
    return ok({ setting1: 'value1', setting2: 42 })
  }

  it('should handle complete error workflow with observability', async () => {
    const path = '/missing.json'
    const result = await readConfigFile(path)

    expect(result.ok).toBe(false)

    if (!result.ok) {
      const domainError = result.error as any

      // 1. Log structured error
      const logContext = toLogContext(domainError)
      expect(logContext.error_kind).toBe('FileNotFound')
      expect(logContext.error_context).toHaveProperty('path', '/missing.json')

      // 2. Send to Sentry
      const sentryError = toSentryError(domainError)
      expect(sentryError.name).toBe('FileNotFound')

      // 3. Record metric
      const metricLabels = toMetricLabels(domainError)
      expect(metricLabels.error_kind).toBe('FileNotFound')

      // 4. Add to trace
      const spanAttrs = toSpanAttributes(domainError)
      expect(spanAttrs['error.kind']).toBe('FileNotFound')
    }
  })

  it('should handle success case', async () => {
    const result = await readConfigFile('/valid.json')

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value).toHaveProperty('setting1', 'value1')
      expect(result.value).toHaveProperty('setting2', 42)
    }
  })
})
