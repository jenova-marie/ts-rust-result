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
