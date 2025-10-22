# Error Design Philosophy

This document explains the design decisions behind ts-rust-result 2.0's opinionated error handling system.

## Table of Contents

- [Why Plain Objects?](#why-plain-objects)
- [Discriminated Unions](#discriminated-unions)
- [Builder Pattern vs Factory Functions](#builder-pattern-vs-factory-functions)
- [Stack Trace Strategy](#stack-trace-strategy)
- [Error Chaining](#error-chaining)
- [Type Safety](#type-safety)
- [Design Patterns](#design-patterns)

---

## Why Plain Objects?

ts-rust-result 2.0 uses **plain objects** for errors instead of `Error` classes. This is a deliberate architectural choice.

### The Problem with Error Classes

```typescript
// Traditional Error class approach
class FileNotFoundError extends Error {
  constructor(public path: string) {
    super(`File not found: ${path}`)
    this.name = 'FileNotFoundError'
  }
}

// Issues:
// ❌ Doesn't serialize to JSON properly (loses class information)
// ❌ Prototype overhead
// ❌ instanceof checks fail across realm boundaries
// ❌ Doesn't work well with structural typing
```

### Plain Object Benefits

```typescript
// ts-rust-result approach
const error = fileNotFound('/missing.txt')
// {
//   kind: 'FileNotFound',
//   message: 'File not found: /missing.txt',
//   context: { path: '/missing.txt' },
//   timestamp: 1234567890
// }

// Benefits:
// ✅ Perfect JSON serialization (logs, network, storage)
// ✅ Zero prototype overhead
// ✅ Structural typing (works everywhere)
// ✅ Framework-agnostic
// ✅ Easy to inspect and debug
```

### JSON Serialization Example

```typescript
import { fileNotFound } from '@jenova-marie/ts-rust-result/errors'

const error = fileNotFound('/config.json')

// Serialize perfectly
const json = JSON.stringify(error)
// {
//   "kind": "FileNotFound",
//   "message": "File not found: /config.json",
//   "context": { "path": "/config.json" },
//   "timestamp": 1234567890
// }

// Send over network, store in database, log to file - just works!
```

### When You Need Error Classes

Only when integrating with tools that expect `Error` instances:

```typescript
import * as Sentry from '@sentry/node'
import { toSentryError } from '@jenova-marie/ts-rust-result/errors'

const result = loadConfig()
if (!result.ok) {
  // Convert to Error instance only for Sentry
  Sentry.captureException(toSentryError(result.error))
}
```

---

## Discriminated Unions

Errors use TypeScript's discriminated unions for **exhaustive type checking**.

### The Pattern

```typescript
type FileSystemError =
  | { kind: 'FileNotFound'; path: string; message: string }
  | { kind: 'FileReadError'; path: string; reason: string; message: string }
  | { kind: 'FileWriteError'; path: string; reason: string; message: string }
  | { kind: 'PermissionDenied'; path: string; operation: string; message: string }
```

The `kind` field is the **discriminator** - it narrows the type.

### Exhaustive Checking

```typescript
function handleFileError(error: FileSystemError): string {
  switch (error.kind) {
    case 'FileNotFound':
      // TypeScript knows error.path exists here
      return `File missing: ${error.path}`

    case 'FileReadError':
      // TypeScript knows error.reason exists here
      return `Read failed: ${error.reason}`

    case 'FileWriteError':
      return `Write failed: ${error.reason}`

    case 'PermissionDenied':
      return `Permission denied: ${error.operation} on ${error.path}`

    // TypeScript enforces we handle ALL cases
    // Add a new error type? Compiler tells you to handle it
  }
}
```

### Type Narrowing

```typescript
function logError(error: FileSystemError) {
  if (error.kind === 'FileNotFound') {
    // TypeScript knows this is FileNotFoundError
    console.log('Missing file:', error.path)
  } else if (error.kind === 'PermissionDenied') {
    // TypeScript knows this is PermissionDeniedError
    console.log('Denied:', error.operation, error.path)
  }
}
```

---

## Builder Pattern vs Factory Functions

ts-rust-result provides **two ways** to create errors: builder pattern and factory shortcuts.

### Builder Pattern - Maximum Flexibility

```typescript
import { error } from '@jenova-marie/ts-rust-result/errors'

const e = error('CustomError')
  .withMessage('Something went wrong')
  .withContext({ userId: 123, operation: 'delete' })
  .withCause(innerError)
  .captureStack()
  .build()
```

**Use when:**
- Creating custom error types
- Need fine-grained control over stack capture
- Building complex error chains
- Context is built dynamically

### Factory Shortcuts - Common Errors

```typescript
import { fileNotFound, invalidJSON } from '@jenova-marie/ts-rust-result/errors'

const e1 = fileNotFound('/missing.txt')
const e2 = invalidJSON('{"bad": json}', 'Unexpected token')
```

**Use when:**
- Using standard error types
- Simple, common error cases
- Want concise code

### Under the Hood

Factory functions use the builder internally:

```typescript
export function fileNotFound(path: string): FileSystemError {
  return error('FileNotFound')
    .withMessage(`File not found: ${path}`)
    .withContext({ path })
    .build() // Builder handles stack capture based on NODE_ENV
}
```

---

## Stack Trace Strategy

Stack traces are **expensive** and **not always needed**. ts-rust-result captures them intelligently.

### The Strategy

```
┌─────────────────────────────────────────┐
│ Capture stacks in development/test     │
│ Skip stacks in production               │
│ Allow per-error override                │
└─────────────────────────────────────────┘
```

### Automatic Capture (NODE_ENV)

```typescript
// In development/test: stacks captured automatically
process.env.NODE_ENV = 'development'
const e1 = fileNotFound('/missing.txt')
// e1.stack = "    at fileNotFound (...)\n    at loadConfig (...)"

// In production: stacks skipped automatically
process.env.NODE_ENV = 'production'
const e2 = fileNotFound('/missing.txt')
// e2.stack = undefined
```

### Global Override

```typescript
import { setCaptureStacks } from '@jenova-marie/ts-rust-result/errors'

// Force enable stacks (even in production - for debugging)
setCaptureStacks(true)

// Force disable stacks (even in dev - for performance testing)
setCaptureStacks(false)

// Reset to NODE_ENV behavior
setCaptureStacks(undefined)
```

### Per-Error Override

```typescript
import { error } from '@jenova-marie/ts-rust-result/errors'

// Force capture for critical error
const critical = error('DatabaseConnectionFailed')
  .withMessage('Cannot connect to database')
  .captureStack() // Override: always capture
  .build()

// Skip stack for expected validation error
const validation = error('RequiredFieldMissing')
  .withMessage('Email is required')
  .skipStack() // Override: never capture
  .build()
```

### When to Capture Stacks

**DO capture stacks for:**
- Unexpected errors (caught exceptions from third-party code)
- Critical infrastructure failures (database, network, file system)
- Errors that need debugging context

**DON'T capture stacks for:**
- Validation errors (user input, schema validation)
- Expected business logic errors (missing config, not found)
- High-volume errors (would bloat logs)

---

## Error Chaining

Complex operations often have **cascading failures**. Error chaining preserves the full context.

### Basic Chaining

```typescript
import { error, fileNotFound } from '@jenova-marie/ts-rust-result/errors'

// Inner error (low-level)
const innerError = fileNotFound('/app/config.json')

// Outer error (high-level)
const outerError = error('ConfigParseError')
  .withMessage('Failed to load application config')
  .withCause(innerError)
  .build()

// Result:
// outerError.cause === innerError
// Full error chain preserved!
```

### Multi-Level Chains

```typescript
// Level 1: File system error
const fsError = fileNotFound('/secrets/api-key.txt')

// Level 2: Config loading error
const configError = error('MissingConfig')
  .withMessage('API key configuration not found')
  .withCause(fsError)
  .build()

// Level 3: Application startup error
const startupError = error('StartupFailed')
  .withMessage('Cannot start application')
  .withCause(configError)
  .build()

// Error chain:
// StartupFailed → MissingConfig → FileNotFound
```

### Logging Error Chains

```typescript
import { toLogContext } from '@jenova-marie/ts-rust-result/observability'

const logContext = toLogContext(startupError)
// {
//   error_kind: 'StartupFailed',
//   error_message: 'Cannot start application',
//   error_cause: {
//     error_kind: 'MissingConfig',
//     error_message: 'API key configuration not found',
//     error_cause: {
//       error_kind: 'FileNotFound',
//       error_message: 'File not found: /secrets/api-key.txt',
//       error_context: { path: '/secrets/api-key.txt' }
//     }
//   }
// }
```

### Wrapping Third-Party Errors

```typescript
import { error } from '@jenova-marie/ts-rust-result/errors'

try {
  await fetch('https://api.example.com/data')
} catch (e) {
  // Wrap third-party error
  const wrappedError = error('NetworkError')
    .withMessage('Failed to fetch data from API')
    .withCause(e) // e can be Error, string, or anything
    .build()
}
```

---

## Type Safety

ts-rust-result leverages TypeScript's type system for **compile-time safety**.

### Result Type Narrowing

```typescript
import { ok, err, type Result } from '@jenova-marie/ts-rust-result'
import { fileNotFound } from '@jenova-marie/ts-rust-result/errors'

function loadFile(path: string): Result<string> {
  if (!exists(path)) {
    return err(fileNotFound(path) as any) // Type limitation workaround
  }
  return ok(readFile(path))
}

const result = loadFile('/config.json')

// Type narrowing with discriminated union
if (result.ok) {
  // TypeScript knows result.value is string
  console.log(result.value.toUpperCase())
} else {
  // TypeScript knows result.error exists
  console.error(result.error.message)
}
```

### Generic Error Types

```typescript
import type { FileSystemError, ValidationError } from '@jenova-marie/ts-rust-result/errors'

// Specific error type
function validatePath(path: string): Result<string, ValidationError> {
  if (!path) {
    return err(requiredFieldMissing('path') as any)
  }
  return ok(path)
}

// Union of error types
function loadAndValidate(path: string): Result<Data, FileSystemError | ValidationError> {
  const validationResult = validatePath(path)
  if (!validationResult.ok) return validationResult

  const fileResult = loadFile(validationResult.value)
  if (!fileResult.ok) return fileResult

  return ok(parse(fileResult.value))
}
```

### Type Inference

```typescript
// TypeScript infers error types
const result = fileNotFound('/missing.txt')
// Type: FileSystemError & { kind: 'FileNotFound' }

// Builder infers from kind parameter
const custom = error('MyCustomError')
  .withMessage('Custom error')
  .build()
// Type: DomainError & { kind: 'MyCustomError' }
```

---

## Design Patterns

### Pattern 1: Function Design

```typescript
// ✅ GOOD: Your functions return Result directly
function loadConfig(): Result<Config, ConfigError> {
  const path = '/app/config.json'
  if (!exists(path)) {
    return err(fileNotFound(path) as any)
  }
  return ok(parse(readFile(path)))
}

// ✅ GOOD: Wrap third-party calls with tryResultSafe
import { tryResultSafe } from '@jenova-marie/ts-rust-result/errors'

async function fetchData(): Promise<Result<Data>> {
  return await tryResultSafe(async () => {
    const response = await fetch('https://api.example.com/data')
    return await response.json()
  })
}

// ❌ BAD: Don't wrap your own Result-returning functions
async function loadConfigBad(): Promise<Result<Config>> {
  return await tryResultSafe(async () => {
    return loadConfig() // Returns Result - double wrapping!
  })
}
```

### Pattern 2: Error Composition

```typescript
import { error } from '@jenova-marie/ts-rust-result/errors'

// Compose complex errors from simple ones
function loadUserConfig(userId: number): Result<Config, ConfigError> {
  // Step 1: Validate input
  if (userId < 0) {
    return err(invalidFieldValue('userId', userId, 'positive number') as any)
  }

  // Step 2: Load file
  const path = `/users/${userId}/config.json`
  const fileResult = loadFile(path)
  if (!fileResult.ok) {
    // Wrap low-level error with high-level context
    return err(
      error('ConfigParseError')
        .withMessage(`Failed to load config for user ${userId}`)
        .withContext({ userId, path })
        .withCause(fileResult.error)
        .build() as any
    )
  }

  // Step 3: Parse config
  return parseConfig(fileResult.value)
}
```

### Pattern 3: Observability Integration

```typescript
import { toLogContext, toSpanAttributes, toMetricLabels } from '@jenova-marie/ts-rust-result/observability'
import pino from 'pino'

const logger = pino()

function handleResult<T>(result: Result<T>): T {
  if (result.ok) {
    return result.value
  }

  const error = result.error as any

  // 1. Structured logging
  logger.error(toLogContext(error), 'Operation failed')

  // 2. Distributed tracing (if using OpenTelemetry)
  const span = trace.getActiveSpan()
  span?.setAttributes(toSpanAttributes(error))

  // 3. Metrics (if using Prometheus)
  errorCounter.inc(toMetricLabels(error))

  // 4. Error monitoring (if using Sentry)
  Sentry.captureException(toSentryError(error))

  throw new Error(error.message) // or handle gracefully
}
```

### Pattern 4: Validation with Zod

```typescript
import { z } from 'zod'
import { fromZodSafeParse } from '@jenova-marie/ts-rust-result/errors'

const ConfigSchema = z.object({
  port: z.number().min(1).max(65535),
  host: z.string(),
  debug: z.boolean()
})

function validateConfig(data: unknown): Result<Config, ValidationError> {
  return fromZodSafeParse(ConfigSchema.safeParse(data))
}

// Usage
const result = validateConfig(rawData)
if (!result.ok) {
  // result.error is ValidationError with structured issues
  logger.error(toLogContext(result.error), 'Config validation failed')
}
```

---

## Summary

ts-rust-result 2.0's error design prioritizes:

1. **Simplicity**: Plain objects are simple and predictable
2. **Type Safety**: Discriminated unions enable exhaustive checking
3. **Performance**: Stack traces only when needed
4. **Observability**: First-class logging, tracing, metrics support
5. **Flexibility**: Builder pattern + factory shortcuts
6. **Interoperability**: JSON serialization, Error conversion

This opinionated approach ensures **consistent error handling** across all Jenova-Marie projects while remaining **lightweight and type-safe**.

---

**Next Steps:**
- [Sentry Integration](./SENTRY.md)
- [OpenTelemetry Integration](./OPENTELEMETRY.md)
- [Zod Integration](./ZOD.md)
- [Main README](./README.md)
