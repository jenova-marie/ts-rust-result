# ts-rust-result API Quick Start

**For AI agents and developers integrating ts-rust-result into your project.**

This guide covers the essential exports, patterns, and opinions that define ts-rust-result. **The patterns section below is the foundation of proper ts-rust-result usage** — read it carefully before diving into the API reference.

---

## The Pattern-First Approach

ts-rust-result's power comes from its **opinionated patterns**. Before using the API, understand how projects should be structured.

### Pattern 1: Domain-Specific Result Wrappers (RECOMMENDED)

**Problem:** Scattered type assertions like `as Result<T, ConfigError>` throughout your codebase.

**Solution:** Create domain-specific helpers with `createDomainResult<E>()` — this is **the foundation for clean, type-safe projects**.

```typescript
// Step 1: Define your domain errors (config-errors.ts)
import { type FileSystemError, type ValidationError } from '@jenova-marie/ts-rust-result/errors'

export type ConfigError = FileSystemError | ValidationError

// Step 2: Create domain-specific helpers (config-result.ts)
import { createDomainResult } from '@jenova-marie/ts-rust-result/helpers'

export const { ok, err } = createDomainResult<ConfigError>()
export type ConfigResult<T> = Result<T, ConfigError>

// Step 3: Use everywhere — completely clean, zero type assertions!
import { ok, err, type ConfigResult } from './config-result.js'
import { fileNotFound, invalidJSON } from './config-errors.js'

export function loadConfigFile(path: string): ConfigResult<string> {
  if (!fs.existsSync(path)) {
    return err(fileNotFound(path))  // ✅ No generic type needed
  }
  return ok(fs.readFileSync(path, 'utf-8'))  // ✅ No cast needed
}

export function parseConfig(content: string): ConfigResult<Config> {
  try {
    return ok(JSON.parse(content))
  } catch (e) {
    return err(invalidJSON(content, String(e)))
  }
}

// Recursive functions work seamlessly
export function processConfig(config: Config): ConfigResult<ProcessedConfig> {
  for (const item of config.items) {
    const result = processConfig(item)
    if (!result.ok) return result  // ✅ Type flows through naturally!
  }
  return ok(transform(config))
}
```

**Why this pattern:**
- ✅ **Zero type assertions** throughout your entire module
- ✅ **Centralized error type management** in one place
- ✅ **Error types visible in signatures** — `ConfigResult<T>` is clear
- ✅ **Recursive functions work perfectly** — errors propagate naturally
- ✅ **IDE autocomplete** — knows all your domain errors
- ✅ **Large project ready** — scales from single module to enterprise apps

**See detailed guide:** [`./content/PATTERNS.md`](./content/PATTERNS.md)

---

### Pattern 2: Union Error Types for Multi-Source Errors

When your functions return errors from multiple sources, use **union types** with exhaustive pattern matching:

```typescript
// Define domain errors (auth-errors.ts)
import { type NetworkError, type ValidationError, error } from '@jenova-marie/ts-rust-result/errors'

export interface InvalidCredentialsError {
  readonly kind: 'InvalidCredentials'
  readonly message: string
}

export type AuthError = NetworkError | ValidationError | InvalidCredentialsError

// Use domain wrapper
import { createDomainResult } from '@jenova-marie/ts-rust-result/helpers'
const { ok, err } = createDomainResult<AuthError>()
export type AuthResult<T> = Result<T, AuthError>

// Implement functions
export async function authenticate(username: string, password: string): AuthResult<User> {
  // Validation step
  if (!username || !password) {
    return err(requiredFieldMissing('username or password'))
  }

  // Network call
  const response = await tryResultSafe(async () => {
    return await fetch('/api/auth', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    }).then(r => r.json())
  })

  if (!response.ok) return response  // ✅ NetworkError flows through

  // Custom validation
  if (!response.value.token) {
    return err(createInvalidCredentialsError('Invalid credentials'))
  }

  return ok(response.value.user)
}

// Exhaustive error handling with pattern matching
function handleAuthError(result: AuthResult<User>) {
  if (result.ok) {
    console.log('User authenticated:', result.value)
    return
  }

  // TypeScript enforces all error kinds are handled
  switch (result.error.kind) {
    case 'RequiredFieldMissing':
      console.error('Missing field:', result.error.field)
      break

    case 'NetworkError':
      console.error('Network failed:', result.error.message)
      break

    case 'SchemaValidation':
      console.error('Validation failed:', result.error.context.issues)
      break

    case 'InvalidCredentials':
      console.error('Bad credentials')
      break

    default:
      // TypeScript enforces exhaustiveness
      const _exhaustive: never = result.error
      throw new Error(`Unknown error: ${_exhaustive}`)
  }
}
```

**Benefits:**
- ✅ **Exhaustive pattern matching** — TypeScript forces you to handle all error types
- ✅ **Type narrowing** — within each case, you know exactly what properties exist
- ✅ **No instanceof checks** — discriminated unions are simpler and more efficient
- ✅ **Clear error flow** — readers understand all possible failures at a glance

**See detailed guide:** [`./content/PATTERNS.md#union-error-types`](./content/PATTERNS.md)

---

### Pattern 3: Error Composition Across Layers

Combine results from functions with different error types:

```typescript
import { type FileSystemError } from '@jenova-marie/ts-rust-result/errors'
import { type ConfigResult, loadConfigFile, parseConfig } from './config-result.js'

// Multi-step operation: FileSystem error → Config error
export async function loadAndValidateConfig(path: string): ConfigResult<Config> {
  // Step 1: Load file (FileSystemError)
  const fileResult = loadConfigFile(path)
  if (!fileResult.ok) {
    // FileSystemError is part of ConfigError, so this works
    return fileResult
  }

  // Step 2: Parse & validate (ConfigError)
  const parseResult = parseConfig(fileResult.value)
  if (!parseResult.ok) {
    return parseResult  // Already ConfigError
  }

  return ok(parseResult.value)
}
```

**When to use:** Functions that call other functions with different error types that share a common error union.

**See detailed guide:** [`./content/PATTERNS.md#error-composition`](./content/PATTERNS.md)

---

### Pattern 4: Type Inference Best Practices

Master TypeScript's type inference to avoid explicit generics:

```typescript
// ❌ Avoid: Explicit generics at return type
function bad(): Result<string, ConfigError> {
  return ok(value) as Result<string, ConfigError>
}

// ✅ GOOD: Let ok() infer from function return type
function good(): Result<string, ConfigError> {
  return ok(value)  // Inferred as Result<string, ConfigError>
}

// ✅ BEST: Use domain wrappers (no generics at all!)
const { ok } = createDomainResult<ConfigError>()
function best(): ConfigResult<string> {
  return ok(value)  // ✅ Perfect!
}

// ✅ For err(), be explicit when needed
function failure(): Result<string, ConfigError> {
  return err<ConfigError>(myError)
}
```

**Key principles:**
1. Domain wrappers eliminate generic parameters entirely
2. `ok()` can infer the error type from function signature
3. `err<E>()` requires explicit generic only when TypeScript can't infer
4. Recursive calls work naturally — error types propagate

**See detailed guide:** [`./content/PATTERNS.md#type-inference-tips`](./content/PATTERNS.md)

---

## Core Exports

### Result Types
```typescript
import { type Ok, type Err, type Result } from '@jenova-marie/ts-rust-result'

type Ok<T> = { ok: true; value: T }
type Err<E = Error> = { ok: false; error: E }
type Result<T, E = Error> = Ok<T> | Err<E>
```

### Constructors & Type Guards
```typescript
import { ok, err, isOk, isErr, unwrap } from '@jenova-marie/ts-rust-result'

// Create results
const success = ok(value)  // ✅ Success with value
const failure = err(error)  // ❌ Failure with error

// Type guards (discriminators)
if (result.ok) {
  // TypeScript narrows to Ok<T> - access result.value
} else {
  // TypeScript narrows to Err<E> - access result.error
}

// Extract value (throws if Err)
const value = unwrap(result)
```

### Functional Utilities
```typescript
import { map, mapErr } from '@jenova-marie/ts-rust-result'

// Transform success value
const doubled = map(result, v => v * 2)

// Transform error
const logged = mapErr(result, e => {
  console.error(e)
  return e
})
```

### Async Support
```typescript
import { tryResult } from '@jenova-marie/ts-rust-result'

// Wrap async operations (converts exceptions to Results)
const result = await tryResult(async () => {
  return await thirdPartyAPI.fetch()
})
```

### Assertions (Return Results, Don't Throw)
```typescript
import { assert, assertOr, assertNotNil } from '@jenova-marie/ts-rust-result'

// Type-safe assertions with optional throwing
const result = assert(x > 0, new Error('Must be positive'), shouldThrow)

// With typed error
const result = assertOr(x > 0, customError, shouldThrow)

// Null/undefined check
const result = assertNotNil(value, 'Value required', shouldThrow)
```

---

## Error Handling with Domain Errors

### Error Factories (Typed Errors)
```typescript
import {
  fileNotFound,
  invalidJSON,
  schemaValidation,
  networkError,
  databaseError,
  authenticateError,
  type FileNotFoundError,
  type ValidationError
} from '@jenova-marie/ts-rust-result/errors'

// Use factory shortcuts
function loadConfig(path: string): Result<Config, FileNotFoundError> {
  if (!exists(path)) {
    return err(fileNotFound(path))  // ✅ Fully typed in v2.1.0+
  }
  return ok(parse(readFile(path)))
}
```

### Error Builder Pattern
```typescript
import { error } from '@jenova-marie/ts-rust-result/errors'

const customError = error('CustomErrorKind')
  .withMessage('Human-readable message')
  .withContext({ field: 'value' })
  .withCause(previousError)  // Error chaining
  .captureStack()  // Force stack capture
  .build()
```

### Error Stack Trace Strategy
```typescript
import { setCaptureStacks } from '@jenova-marie/ts-rust-result/errors'

// Automatic (respects NODE_ENV):
// - Development/test: stacks captured
// - Production: stacks skipped (performance)

// Override globally
setCaptureStacks(true)   // Always capture
setCaptureStacks(false)  // Never capture
setCaptureStacks(undefined)  // Reset to NODE_ENV behavior
```

---

## The Core Opinion: Proper Usage Pattern

### ✅ Your Functions Return Result<T> Directly
```typescript
// GOOD: Your function handles errors, returns Result
function loadUser(id: string): Result<User, FileNotFoundError> {
  if (!userExists(id)) {
    return err(fileNotFound(`user:${id}`))
  }
  return ok(getUser(id))
}
```

### ✅ Third-Party Calls Use tryResult()
```typescript
// GOOD: Wrap external code that throws
async function fetchRemoteData(): Promise<Result<Data>> {
  return await tryResult(async () => {
    const response = await fetch('https://api.example.com/data')
    return await response.json()
  })
}
```

### ❌ Anti-Pattern: Don't Wrap Your Own Functions
```typescript
// BAD: Your functions already return Result
async function badExample(): Promise<Result<T>> {
  return await tryResult(async () => {
    return loadUser('123')  // ❌ loadUser returns Result, double wrapping!
  })
}
```

### ❌ Anti-Pattern: Avoid Type Assertions (Use Domain Wrappers Instead)
```typescript
// BAD: Scattered type assertions
function process(): Result<T, ConfigError> {
  return ok(value) as Result<T, ConfigError>  // ❌ Repetitive
}

// GOOD: Create domain-specific helpers (see below)
const { ok, err } = createDomainResult<ConfigError>()
function process(): ConfigResult<T> {
  return ok(value)  // ✅ Clean!
}
```

---

## Zod Integration

```typescript
import { z } from 'zod'
import { fromZodSchema } from '@jenova-marie/ts-rust-result/errors'

const UserSchema = z.object({
  name: z.string().min(1),
  email: z.string().email()
})

function validateUser(data: unknown): Result<User, ValidationError> {
  return fromZodSchema(UserSchema, data)
}

const result = validateUser(rawData)
if (!result.ok) {
  console.error(result.error.context.issues)  // Detailed validation errors
}
```

---

## Observability Integration

### Logging with Structured Context
```typescript
import { toLogContext } from '@jenova-marie/ts-rust-result/observability'

const result = loadConfig()
if (!result.ok) {
  logger.error(toLogContext(result.error), 'Config failed')
  // Logs error kind, message, context, and full cause chain
}
```

### OpenTelemetry Tracing
```typescript
import { toSpanAttributes, recordErrorEvent } from '@jenova-marie/ts-rust-result/observability'
import { trace, SpanStatusCode } from '@opentelemetry/api'

const span = trace.getActiveSpan()
const result = loadConfig()

if (!result.ok) {
  span?.setAttributes(toSpanAttributes(result.error))
  span?.setStatus({ code: SpanStatusCode.ERROR })
  recordErrorEvent(span, result.error)
}
```

### Sentry Error Monitoring
```typescript
import { toSentryError } from '@jenova-marie/ts-rust-result/observability'
import * as Sentry from '@sentry/node'

const result = loadConfig()
if (!result.ok) {
  Sentry.captureException(toSentryError(result.error))
}
```

---

## Type Patterns for Type-Safe Code

### Union Error Types
```typescript
import { type FileSystemError, type ValidationError } from '@jenova-marie/ts-rust-result/errors'

// Combine standard + custom errors
type AppError = FileSystemError | ValidationError | CustomError

function complexOperation(): Result<Data, AppError> {
  // Can return any of the error types
}
```

### Exhaustive Error Handling
```typescript
function handleError(result: Result<Data, AppError>) {
  if (!result.ok) {
    switch (result.error.kind) {
      case 'FileNotFound':
        console.error('File missing:', result.error.path)
        break
      case 'SchemaValidation':
        console.error('Invalid data:', result.error.context.issues)
        break
      case 'CustomError':
        console.error('Custom:', result.error.message)
        break
      // TypeScript enforces all cases handled!
    }
  }
}
```

### Type Inference Best Practices
```typescript
// ✅ Let ok() infer from function return type
function success(): Result<string, ConfigError> {
  return ok(value)  // Inferred as Result<string, ConfigError>
}

// ✅ Be explicit with err<E>()
function failure(): Result<string, ConfigError> {
  return err<ConfigError>(myError)
}

// ✅ Use domain wrappers (no generics needed!)
const { ok, err } = createDomainResult<ConfigError>()
function clean(): ConfigResult<string> {
  return ok(value)  // Clean!
}
```

---

## Module Exports Reference

```typescript
// Core
import {
  ok, err,                    // Constructors
  isOk, isErr,               // Type guards
  unwrap,                    // Extract or throw
  map, mapErr,               // Functional transforms
  assert, assertOr, assertNotNil,  // Assertions
  tryResult,                 // Async wrapper
  type Ok, type Err, type Result   // Types
} from '@jenova-marie/ts-rust-result'

// Error handling & factories
import {
  error,                          // Builder pattern
  fileNotFound,
  invalidJSON,
  networkError,
  databaseError,
  schemaValidation,
  authenticateError,
  tryResultSafe,                  // Typed async wrapper
  fromZodSafeParse,              // Zod integration
  fromZodSchema,
  setCaptureStacks,
  type DomainError,              // Base error type
  type FileSystemError,
  type ValidationError,
  type ParseError,
  type NetworkError,
  type DatabaseError
} from '@jenova-marie/ts-rust-result/errors'

// Helpers (v2.2.0+)
import {
  createDomainResult           // Create domain-specific wrappers
} from '@jenova-marie/ts-rust-result/helpers'

// Observability
import {
  toLogContext,               // Structured logging
  toSpanAttributes,           // OpenTelemetry spans
  recordErrorEvent,
  recordErrorCauseChain,
  toSentryError,             // Sentry integration
  toMetricLabels             // Prometheus metrics
} from '@jenova-marie/ts-rust-result/observability'
```

---

## Accessing Documentation

### Offline Documentation
All documentation is included in npm packages for offline access:

```bash
# Extract from installed package
cd node_modules/@jenova-marie/ts-rust-result
open docs/index.html  # TypeDoc API reference
```

### Online Resources
- **README** - Project overview and philosophy: `./README.md`
- **API Documentation** - Generated TypeDoc: `./docs/index.html`
- **Error Design** - Architectural decisions: `./content/ERROR_DESIGN.md`
- **Patterns** - Common patterns & best practices: `./content/PATTERNS.md`
- **Zod Integration** - Schema validation: `./content/ZOD.md`
- **OpenTelemetry** - Distributed tracing: `./content/OPENTELEMETRY.md`
- **Sentry Integration** - Error monitoring: `./content/SENTRY.md`

### TypeDoc Integration
```bash
# Generate/update docs locally
pnpm docs

# View in browser
open docs/index.html
```

---

## Further Reading

This guide covers the essential API and patterns. For detailed information:

1. **Getting Started** - See `./README.md` for philosophy and feature overview
2. **Patterns & Best Practices** - See `./content/PATTERNS.md` for:
   - Domain-specific result wrappers (detailed)
   - Recursive functions
   - Error composition
   - Type inference tips

3. **Error Design** - See `./content/ERROR_DESIGN.md` for:
   - Plain objects vs Error classes
   - Discriminated unions
   - Error chaining strategies
   - Stack trace configuration

4. **Observability** - See `./content/OPENTELEMETRY.md` for:
   - Distributed tracing patterns
   - Span attributes and events
   - Error cause chain recording

5. **Validation** - See `./content/ZOD.md` for:
   - Zod schema integration
   - Form validation patterns
   - API response validation

---

## Quick Checklist for New Projects

- [ ] Choose error types (standard + custom) or use domain wrappers
- [ ] Return `Result<T, E>` from your own functions
- [ ] Use `tryResult()` for third-party calls that throw
- [ ] Use `createDomainResult<E>()` to eliminate type assertions
- [ ] Integrate logging with `toLogContext()`
- [ ] Add observability: OpenTelemetry spans or Sentry
- [ ] Test both success and error paths
- [ ] Document error types in function signatures

---

## Environment Requirements

- **Node.js**: 18.0.0+
- **TypeScript**: 4.5+
- **Module Systems**: ESM (native) and CommonJS (compatibility layer)
- **Dependencies**: Zero runtime dependencies (Zod is optional peer)

---

**Version**: 2.2.12 | **License**: GPL-3.0 | Made with 💖 by Pippa
