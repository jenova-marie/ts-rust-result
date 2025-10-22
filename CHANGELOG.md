# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Nothing yet

### Changed
- Nothing yet

### Deprecated
- Nothing yet

### Removed
- Nothing yet

### Fixed
- Nothing yet

### Security
- Nothing yet

## [2.2.0] - 2025-10-22

### Added - Domain-Specific Helper Utilities

**New `createDomainResult<E>()` Helper**
- Eliminates ALL type assertions when working with custom error types
- Returns domain-bound `ok()` and `err()` functions
- No more `err<ConfigError>()` or `as Result<T, E>` casts needed
- Clean, ergonomic API for domain-specific Result usage

**Comprehensive Pattern Documentation**
- New `content/PATTERNS.md` guide covering:
  - Domain-specific Result wrappers
  - Union error type patterns
  - Recursive function patterns
  - Error composition strategies
  - Type inference best practices

**Package Exports**
- Added `/helpers` subpath export: `@jenova-marie/ts-rust-result/helpers`
- Export `createDomainResult<E>()` function
- Export `DomainResult<T, E>` type utility

**Real-World Tested**
- Based on feedback from team-wonder-logger integration
- Patterns validated in production config loading scenarios
- Addresses type widening, recursive functions, and error composition

### Examples

Before (2.1.x):
```typescript
function loadConfig(path: string): Result<Config, ConfigError> {
  return err<ConfigError>(fileNotFound(path))  // ❌ Generic needed
  return ok(config) as Result<Config, ConfigError>  // ❌ Cast needed
}
```

After (2.2.0):
```typescript
// config-result.ts - create once
const { ok, err } = createDomainResult<ConfigError>()

// config-loader.ts - use everywhere
function loadConfig(path: string): ConfigResult<Config> {
  return err(fileNotFound(path))  // ✅ Clean!
  return ok(config)  // ✅ Clean!
}
```

### Migration

**Fully backward compatible** - existing code continues to work. The new helpers are opt-in.

To adopt the new pattern:
1. Create domain-specific wrappers with `createDomainResult<YourErrorType>()`
2. Export the `ok` and `err` functions for your module
3. Replace `Result<T, YourErrorType>` with `YourResult<T>` type alias
4. Remove all `err<YourErrorType>()` generics and `as Result<T, E>` casts

See `content/PATTERNS.md` for detailed migration examples.

## [2.1.0] - 2025-01-22

### Added - Full Generic Type Support

**Generic Result Type**
- **BREAKING (Minor)**: `Result<T>` → `Result<T, E = Error>` with default Error type for backward compatibility
- **BREAKING (Minor)**: `Err` → `Err<E = Error>` with generic error type parameter
- All core functions now support generic error types:
  - `err<E>(error: E): Result<never, E>` - Fully typed error creation
  - `isOk<T, E>()`, `isErr<T, E>()` - Type guards preserve error types
  - `unwrap<T, E>()`, `map<T, U, E>()`, `mapErr<T, E, F>()` - Error types flow through transformations
  - `tryResult<T, E>()`, `assert<E>()`, `assertOr<E>()`, `assertNotNil<T, E>()` - Generic error support

**Type Safety Improvements**
- **No more `as any` casts required** when using DomainError types
- Full IntelliSense support for error properties (kind, context, etc.)
- Type inference works automatically - `err(fileNotFound(path))` infers `Result<never, FileNotFoundError>`
- Union error types fully supported: `Result<Config, FileNotFoundError | ValidationError>`
- Pattern matching with full type narrowing on `result.error.kind`

**Updated Examples**
- All documentation examples updated to use typed Result pattern
- Removed `as any` casts from README, JSDoc, and tests
- Added type annotations to demonstrate best practices

### Changed

**Function Signatures (Backward Compatible)**
- Default `E = Error` parameter ensures existing code continues to work
- `Result<T>` still valid (equivalent to `Result<T, Error>`)
- Only breaking for code that explicitly typed errors (rare edge case)

**Error Conversion Functions**
- `tryResultSafe<T>()` → `tryResultSafe<T>(): Promise<Result<T, UnexpectedError>>`
- `tryResultSafeSync<T>()` → `tryResultSafeSync<T>(): Result<T, UnexpectedError>`
- Removed TODO comments about typing - now fully typed

### Migration Guide

**From 2.0.x to 2.1.0**

Before (2.0.x - required `as any`):
```typescript
import { err, type Result } from '@jenova-marie/ts-rust-result'
import { fileNotFound } from '@jenova-marie/ts-rust-result/errors'

function loadConfig(path: string): Result<Config> {
  if (!exists(path)) {
    return err(fileNotFound(path) as any)  // ❌ Type cast required
  }
  return ok(config)
}
```

After (2.1.0 - fully typed):
```typescript
import { err, type Result } from '@jenova-marie/ts-rust-result'
import { fileNotFound, type FileNotFoundError } from '@jenova-marie/ts-rust-result/errors'

function loadConfig(path: string): Result<Config, FileNotFoundError> {
  if (!exists(path)) {
    return err(fileNotFound(path))  // ✅ Fully typed, no cast needed!
  }
  return ok(config)
}

// Consumer code gets full type safety
const result = loadConfig('config.json')
if (!result.ok) {
  console.log(result.error.kind)    // ✅ TypeScript knows kind exists
  console.log(result.error.path)    // ✅ TypeScript knows path exists
  console.log(result.error.context) // ✅ TypeScript knows context exists
}
```

**Union Error Types**:
```typescript
type ConfigError = FileNotFoundError | ValidationError | ParseError

function loadAndValidateConfig(path: string): Result<Config, ConfigError> {
  // All three error types work seamlessly
  if (!exists(path)) return err(fileNotFound(path))
  if (!valid) return err(schemaValidation(issues))
  if (!parseable) return err(invalidJSON(content, parseError))
  return ok(config)
}
```

### Notes

- This is a **semver minor** release (additive change with default parameters)
- Existing code using `Result<T>` continues to work unchanged
- Recommended to add explicit error types for new code: `Result<T, E>`
- Full backward compatibility with 2.0.x maintained

## [2.0.0] - 2025-01-21

### Added - Opinionated Error Infrastructure

**Domain Error System**
- 8 standard error categories with discriminated union types
  - `FileSystemError` - File operations (FileNotFound, FileReadError, FileWriteError, PermissionDenied)
  - `ParseError` - Parsing failures (InvalidJSON, InvalidYAML, SchemaMismatch, MalformedData)
  - `ValidationError` - Input validation (RequiredFieldMissing, InvalidFieldValue, SchemaValidation, BusinessRuleViolation)
  - `NetworkError` - Network operations (ConnectionFailed, RequestTimeout, DNSResolutionFailed, HTTPError)
  - `DatabaseError` - Database operations (ConnectionFailed, QueryError, TransactionFailed, ConstraintViolation)
  - `AuthError` - Authentication/authorization (AuthenticationFailed, AuthorizationFailed, TokenExpired, InvalidCredentials)
  - `ConfigError` - Configuration issues (MissingConfig, InvalidConfig, ConfigParseError)
  - `UnexpectedError` - Catch-all for unknown errors

**Builder Pattern**
- Fluent API for creating errors: `error('kind').withMessage().withContext().withCause().build()`
- Methods: `withMessage()`, `withContext()`, `withCause()`, `captureStack()`, `skipStack()`
- Type-safe builder with generic kind parameter

**Factory Functions** (30+ convenience shortcuts)
- FileSystem: `fileNotFound()`, `fileReadError()`, `fileWriteError()`, `permissionDenied()`
- Parse: `invalidJSON()`, `invalidYAML()`, `schemaMismatch()`, `malformedData()`
- Validation: `requiredFieldMissing()`, `invalidFieldValue()`, `schemaValidation()`, `businessRuleViolation()`
- Network: `connectionFailed()`, `requestTimeout()`, `dnsResolutionFailed()`, `httpError()`
- Database: `dbConnectionFailed()`, `queryError()`, `transactionFailed()`, `constraintViolation()`
- Auth: `authenticationFailed()`, `authorizationFailed()`, `tokenExpired()`, `invalidCredentials()`
- Config: `missingConfig()`, `invalidConfig()`, `configParseError()`
- Unexpected: `unexpected()`

**Smart Stack Traces**
- NODE_ENV-aware automatic capture (dev/test only by default, skipped in production)
- Global override: `setCaptureStacks(true/false/undefined)`
- Per-error override: `.captureStack()` or `.skipStack()`
- Performance-optimized for production workloads

**Error Chaining**
- Preserve full error context with `.withCause(error)`
- Multi-level error chains supported
- Cause chains preserved in logging, tracing, and error monitoring

**Error Conversion**
- `fromError(e)` - Convert any Error to DomainError
- `toSentryError(error)` - Convert DomainError to Error instance for Sentry
- Automatic error normalization and context preservation

**Zod Integration**
- `fromZodSafeParse(result)` - Convert Zod SafeParseReturnType to Result
- `fromZodSchema(schema, data)` - One-liner schema validation
- `tryResultSafe(fn)` - Async wrapper that auto-detects DomainErrors
- Structured validation error context with issue paths and messages
- Optional peer dependency (zod ^3.0.0)

**Observability Built-in**

*Structured Logging*
- `toLogContext(error)` - Convert to structured log object (Pino, Winston, Bunyan)
- Automatic cause chain flattening with depth protection
- JSON-serializable error context

*Distributed Tracing*
- `toSpanAttributes(error)` - OpenTelemetry span attributes
- `toSpanErrorEvent(error)` - Span error events
- Automatic error kind, message, context, and cause chain inclusion

*Metrics*
- `toMetricLabels(error)` - Prometheus/Grafana metric labels
- `LABEL_CARDINALITY_GUIDANCE` - Safe vs unsafe label guidance
- Error kind as safe low-cardinality label

**Package Structure**
- Subpath exports for clean imports:
  - `@jenova-marie/ts-rust-result` - Core Result API (unchanged from 1.x)
  - `@jenova-marie/ts-rust-result/errors` - Error infrastructure
  - `@jenova-marie/ts-rust-result/observability` - Logging, tracing, metrics

**Documentation**
- [ERROR_DESIGN.md](./ERROR_DESIGN.md) - Design philosophy and patterns
- [SENTRY.md](./SENTRY.md) - Sentry integration guide with examples
- [OPENTELEMETRY.md](./OPENTELEMETRY.md) - OpenTelemetry integration guide
- [ZOD.md](./ZOD.md) - Zod + Result patterns and best practices
- Updated README with "What's New in 2.0" section and quick examples

**Testing**
- 78 tests passing (42 existing + 36 new integration tests)
- Comprehensive integration tests covering all error types, builder, factories, conversion, observability
- Real-world usage scenario tests

**CI/CD**
- Automated release workflow (`.github/workflows/release.yml`)
- Multi-platform CI testing (Ubuntu, macOS, Windows)
- Multi-version Node.js testing (18, 20, 22)
- Codecov integration for coverage tracking
- Automated npm publishing on v* tags

### Changed
- Package version bumped to 2.0.0
- Updated package.json with subpath exports configuration
- Updated TypeScript build to include new error and observability modules

### Migration from 1.x
- **No breaking changes** - All 1.x code continues to work unchanged
- Core Result API (`ok()`, `err()`, `isOk()`, `isErr()`, `map()`, `mapErr()`, `unwrap()`, `tryResult()`, assertions) remains identical
- New error infrastructure is **opt-in** through separate imports from `/errors` and `/observability`
- Unopinionated 1.x version remains available: [@jenova-marie/ts-rust-result@1.3.6](https://www.npmjs.com/package/@jenova-marie/ts-rust-result/v/1.3.6)

### Notes
- This release transforms ts-rust-result into an **opinionated error handling framework** while maintaining full backward compatibility
- Designed for **Jenova-Marie projects** to ensure consistent error handling across all codebases
- Built-in observability ensures errors integrate seamlessly with Sentry, OpenTelemetry, Prometheus, and Grafana Loki
- Zero runtime dependencies (Zod is optional peer dependency)
- Production-optimized with smart stack trace capture

## [1.0.1] - 2024-12-19

### Added
- Initial stable release
- Core Result types and functions (`Ok<T>`, `Err`, `Result<T>`)
- Type guards (`isOk`, `isErr`)
- Utility functions (`unwrap`, `map`, `mapErr`)
- Async support with `tryResult` for wrapping async operations
- Assertion helpers (`assert`, `assertOr`, `assertNotNil`)
- Full TypeScript support with comprehensive type definitions
- Zero-dependency implementation
- Comprehensive test suite with Jest
- JSDoc documentation with TypeDoc generation
- Complete README with real-world usage examples

### Features
- **Rust-style Result types** - `Ok<T>` and `Err` with full TypeScript support
- **Type-safe error handling** - No more throwing exceptions everywhere
- **Functional utilities** - `map`, `mapErr`, `unwrap`, and more
- **Async support** - `tryResult` for wrapping async operations
- **Assertion helpers** - `assert`, `assertOr`, `assertNotNil` with Result returns
- **Zero dependencies** - Lightweight and tree-shakeable
- **TypeScript-first** - Full type safety and IntelliSense support

## [1.0.0] - 2024-12-19

### Added
- Initial release
- Core Result types and functions 💎
- Async support with `tryResult` 🌊
- Assertion helpers 🧪
- Full TypeScript support 🔵

---

## Version History

- **1.0.1** - First stable release with comprehensive documentation and testing
- **1.0.0** - Initial release with core functionality
