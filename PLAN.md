# ts-rust-result 2.0.0 - Opinionated Error Handling

**Status**: 🚧 Planning Phase
**Target Version**: 2.0.0 (Breaking - adds opinionated error architecture)
**Disposable**: This file will be deleted after implementation

---

## Goals

Transform ts-rust-result from a generic Result type library into an opinionated error handling framework for the entire Jenova-Marie ecosystem.

> **Note**: If you prefer the unopinionated version of ts-rust-result without the error infrastructure, version 1.3.6 remains available at https://www.npmjs.com/package/@jenova-marie/ts-rust-result/v/1.3.6

### Success Criteria
- ✅ All Jenova-Marie projects use consistent error shapes
- ✅ Common errors (file I/O, parsing, network, etc.) defined once
- ✅ Built-in observability (Loki/Tempo/Prometheus serialization)
- ✅ Type-safe error handling with discriminated unions
- ✅ Zero-friction Sentry/OpenTelemetry integration
- ✅ Comprehensive documentation and migration guide

---

## Architecture Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Error representation | Plain discriminated unions | JSON serializable, lightweight, no prototype overhead |
| Stack traces | Optional `stack?: string` | Only for critical/unexpected errors; avoid bloat |
| Stack capture | Auto in dev/test, skip in prod | Configured via `NODE_ENV` |
| Error classes | Never (except Sentry conversion) | Keep plain objects; convert on-demand for monitoring tools |
| Context typing | Flexible `Record<string, unknown>` | Allow extension without schema constraints |
| Cause chains | `cause?: DomainError \| unknown` | Maximum flexibility for wrapping third-party errors |
| Error factories | Builder pattern | `error('FileNotFound').withContext({...}).build()` |
| Observability | Separate `/observability` export | Optional import, doesn't pollute core |
| Zod integration | Built-in helpers | `fromZodSafeParse()` converter |
| Package structure | Monolithic `/errors` export | Single package, multiple subpaths |
| Versioning | 2.0.0 | Breaking change - adds strong opinions |

---

## Package Structure

```
@jenova-marie/ts-rust-result/
├── src/
│   ├── TsRustResult.ts          # Existing core (unchanged)
│   ├── index.ts                 # Main export (Result types + re-export errors)
│   │
│   ├── errors/
│   │   ├── index.ts             # Re-exports all error infrastructure
│   │   ├── types.ts             # DomainError interface, standard error types
│   │   ├── builder.ts           # error().withContext().build() API
│   │   ├── factories.ts         # Convenience shortcuts (fileNotFound(), etc.)
│   │   ├── conversion.ts        # fromError(), toSentryError(), tryResultSafe()
│   │   ├── stack.ts             # Stack capture utilities (respects NODE_ENV)
│   │   └── zod.ts               # fromZodSafeParse(), fromZodSchema()
│   │
│   └── observability/
│       ├── index.ts             # Re-exports
│       ├── logging.ts           # toLogContext() for Pino/Loki
│       ├── tracing.ts           # toSpanAttributes() for OpenTelemetry
│       └── metrics.ts           # toMetricLabels() for Prometheus
│
├── test/
│   ├── TsRustResult.test.ts     # Existing tests
│   ├── errors.test.ts           # Error type tests
│   ├── builder.test.ts          # Builder pattern tests
│   ├── conversion.test.ts       # Error conversion tests
│   ├── zod.test.ts              # Zod integration tests
│   └── observability.test.ts    # Observability helper tests
│
├── docs/
│   ├── ERROR_DESIGN.md          # Philosophy: why plain objects, patterns
│   ├── MIGRATION_GUIDE.md       # 1.x -> 2.x upgrade path
│   ├── SENTRY.md                # Sentry integration examples
│   ├── OPENTELEMETRY.md         # OpenTelemetry integration examples
│   └── ZOD.md                   # Zod + Result patterns
│
├── package.json                 # Updated to 2.0.0, new exports
├── CHANGELOG.md                 # 2.0.0 release notes
└── README.md                    # Updated with error examples
```

---

## Implementation Plan

### Phase 1: Core Error Infrastructure
**Goal**: Define base types and builder pattern

#### 1.1 Create `src/errors/types.ts`
- [ ] Define `DomainError` base interface
  ```typescript
  export interface DomainError {
    readonly kind: string
    readonly message: string
    readonly context?: Record<string, unknown>
    readonly cause?: DomainError | unknown
    readonly stack?: string
    readonly timestamp?: number
  }
  ```

- [ ] Define standard error categories:
  - [ ] `FileSystemError` (FileNotFound, FileReadError, FileWriteError, PermissionDenied)
  - [ ] `ParseError` (InvalidJSON, InvalidYAML, InvalidXML, InvalidTOML)
  - [ ] `ValidationError` (SchemaValidation, RequiredFieldMissing, InvalidFieldValue, TypeMismatch)
  - [ ] `NetworkError` (ConnectionFailed, Timeout, DNSResolutionFailed, HTTPError)
  - [ ] `DatabaseError` (ConnectionFailed, QueryFailed, TransactionFailed, ConstraintViolation)
  - [ ] `AuthError` (Unauthenticated, Unauthorized, TokenExpired, InvalidCredentials)
  - [ ] `ConfigError` (MissingConfig, InvalidConfig, ConfigParseError)
  - [ ] `UnexpectedError` (Unexpected, catch-all for unknown errors)

- [ ] Each error type must include:
  - `kind`: Discriminator (literal type)
  - `message`: Human-readable description
  - Type-specific context fields (e.g., `path` for FileSystemError)

#### 1.2 Create `src/errors/stack.ts`
- [ ] Implement `captureStack(): string` with NODE_ENV awareness
  ```typescript
  export function captureStack(): string {
    if (process.env.NODE_ENV === 'production') return ''
    const stack = new Error().stack || ''
    return stack.split('\n').slice(2).join('\n') // Remove captureStack frame
  }
  ```

- [ ] Implement `shouldCaptureStack(): boolean` helper
  ```typescript
  export function shouldCaptureStack(): boolean {
    return process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test'
  }
  ```

- [ ] Add configuration override mechanism
  ```typescript
  let captureStacksOverride: boolean | undefined

  export function setCaptureStacks(enabled: boolean): void {
    captureStacksOverride = enabled
  }

  export function getCaptureStacks(): boolean {
    return captureStacksOverride ?? shouldCaptureStack()
  }
  ```

#### 1.3 Create `src/errors/builder.ts`
- [ ] Implement builder pattern API
  ```typescript
  export interface ErrorBuilder<K extends string = string> {
    withMessage(message: string): ErrorBuilder<K>
    withContext(context: Record<string, unknown>): ErrorBuilder<K>
    withCause(cause: DomainError | unknown): ErrorBuilder<K>
    captureStack(): ErrorBuilder<K>
    skipStack(): ErrorBuilder<K>
    build(): DomainError & { kind: K }
  }

  export function error<K extends string>(kind: K): ErrorBuilder<K>
  ```

- [ ] Builder should:
  - Auto-capture stack based on NODE_ENV (unless overridden)
  - Auto-set timestamp to `Date.now()`
  - Validate `message` is not empty before build
  - Return frozen object (immutable)

#### 1.4 Create `src/errors/factories.ts`
- [ ] Implement shortcut factories for each standard error
  ```typescript
  // FileSystem shortcuts
  export const fileNotFound = (path: string) =>
    error('FileNotFound').withMessage(`File not found: ${path}`).withContext({ path }).build()

  export const fileReadError = (path: string, reason: string) =>
    error('FileReadError')
      .withMessage(`Failed to read file '${path}': ${reason}`)
      .withContext({ path, reason })
      .build()

  // Parse shortcuts
  export const invalidJSON = (input: string, parseError: string) =>
    error('InvalidJSON')
      .withMessage(`Invalid JSON: ${parseError}`)
      .withContext({ input: input.substring(0, 100), parseError })
      .build()

  // ... (all standard error types)
  ```

- [ ] Factories should use builder internally
- [ ] All factories capture stack automatically (builder handles NODE_ENV)

#### 1.5 Create `src/errors/conversion.ts`
- [ ] Implement `fromError(error: unknown): UnexpectedError`
  - Convert Error instances, preserve stack
  - Wrap non-Error values with new stack
  - Include `originalError` property

- [ ] Implement `toSentryError(error: DomainError): Error`
  - Create Error instance with `error.kind` as name
  - Use captured stack or generate new one
  - Assign `context` fields as error properties

- [ ] Implement `tryResultSafe<T>(fn: () => Promise<T>): Promise<Result<T, UnexpectedError>>`
  - Wrap async function execution
  - Convert throws to UnexpectedError via `fromError()`
  - Preserve existing Result returns (detect `_isr`)

#### 1.6 Create `src/errors/zod.ts`
- [ ] Implement `fromZodSafeParse<T>(result: SafeParseReturnType<unknown, T>): Result<T, ValidationError>`
  ```typescript
  export function fromZodSafeParse<T>(
    result: z.SafeParseReturnType<unknown, T>
  ): Result<T, ValidationError> {
    if (result.success) {
      return ok(result.data)
    }

    const issues = result.error.errors.map(e => ({
      path: e.path.map(String),
      message: e.message
    }))

    return err(
      error('SchemaValidation')
        .withMessage(`Validation failed: ${issues.length} issue(s)`)
        .withContext({ issues })
        .build()
    )
  }
  ```

- [ ] Implement `fromZodSchema<T>(schema: z.ZodSchema<T>, data: unknown): Result<T, ValidationError>`
  - Convenience wrapper around `schema.safeParse(data)`

- [ ] Add tests with various Zod schemas (objects, arrays, unions)

#### 1.7 Create `src/errors/index.ts`
- [ ] Re-export all error infrastructure
  ```typescript
  export * from './types.js'
  export * from './builder.js'
  export * from './factories.js'
  export * from './conversion.js'
  export * from './stack.js'
  export * from './zod.js'
  ```

---

### Phase 2: Observability Helpers
**Goal**: Structured logging, tracing, and metrics integration

#### 2.1 Create `src/observability/logging.ts`
- [ ] Implement `toLogContext(error: DomainError): Record<string, unknown>`
  ```typescript
  export function toLogContext(error: DomainError): Record<string, unknown> {
    return {
      error_kind: error.kind,
      error_message: error.message,
      error_context: error.context,
      error_timestamp: error.timestamp,
      error_stack: error.stack,
      error_cause: error.cause ? toLogContext(error.cause as DomainError) : undefined
    }
  }
  ```

- [ ] Handle cause chains recursively (max depth 10 to prevent infinite loops)
- [ ] Flatten nested context for Grafana Loki labels
  ```typescript
  export function toFlatLogContext(error: DomainError): Record<string, string | number | boolean> {
    const flat: Record<string, string | number | boolean> = {
      error_kind: error.kind,
      error_message: error.message
    }

    if (error.context) {
      for (const [key, value] of Object.entries(error.context)) {
        flat[`error_context_${key}`] = String(value)
      }
    }

    return flat
  }
  ```

#### 2.2 Create `src/observability/tracing.ts`
- [ ] Implement `toSpanAttributes(error: DomainError): Record<string, string | number | boolean>`
  ```typescript
  export function toSpanAttributes(error: DomainError): Record<string, string | number | boolean> {
    const attrs: Record<string, string | number | boolean> = {
      'error.kind': error.kind,
      'error.message': error.message,
      'error.timestamp': error.timestamp || Date.now()
    }

    if (error.stack) {
      attrs['error.stack'] = error.stack
    }

    // Flatten context
    if (error.context) {
      for (const [key, value] of Object.entries(error.context)) {
        attrs[`error.context.${key}`] = typeof value === 'object' ? JSON.stringify(value) : String(value)
      }
    }

    return attrs
  }
  ```

- [ ] Follow OpenTelemetry semantic conventions for error attributes
- [ ] Support nested spans for error cause chains

#### 2.3 Create `src/observability/metrics.ts`
- [ ] Implement `toMetricLabels(error: DomainError): Record<string, string>`
  ```typescript
  export function toMetricLabels(error: DomainError): Record<string, string> {
    return {
      error_kind: error.kind,
      // Include high-cardinality labels cautiously
      ...extractHighCardinalityLabels(error.context)
    }
  }
  ```

- [ ] Provide guidance on label cardinality (avoid unbounded values like file paths)
- [ ] Example Prometheus counter integration:
  ```typescript
  const errorCounter = new promClient.Counter({
    name: 'app_errors_total',
    help: 'Total application errors by kind',
    labelNames: ['error_kind']
  })

  function recordError(error: DomainError): void {
    errorCounter.inc(toMetricLabels(error))
  }
  ```

#### 2.4 Create `src/observability/index.ts`
- [ ] Re-export all observability helpers
  ```typescript
  export * from './logging.js'
  export * from './tracing.js'
  export * from './metrics.js'
  ```

---

### Phase 3: Testing
**Goal**: 100% test coverage for new error infrastructure

#### 3.1 Create `test/errors.test.ts`
- [ ] Test all standard error types
- [ ] Verify discriminated union type narrowing
- [ ] Test error immutability (frozen objects)
- [ ] Test timestamp auto-generation
- [ ] Test cause chain creation

#### 3.2 Create `test/builder.test.ts`
- [ ] Test builder pattern fluent API
- [ ] Test stack capture based on NODE_ENV
  - Mock `process.env.NODE_ENV` in tests
  - Verify stack present in dev/test, absent in production
- [ ] Test stack capture override (`captureStack()`, `skipStack()`)
- [ ] Test message validation (reject empty messages)
- [ ] Test context merging

#### 3.3 Create `test/conversion.test.ts`
- [ ] Test `fromError()` with Error instances
- [ ] Test `fromError()` with non-Error values (strings, objects, null)
- [ ] Test `toSentryError()` conversion preserves stack and context
- [ ] Test `tryResultSafe()` catches throws and wraps as UnexpectedError
- [ ] Test `tryResultSafe()` preserves existing Result returns (no double wrapping)

#### 3.4 Create `test/zod.test.ts`
- [ ] Test `fromZodSafeParse()` with successful validation
- [ ] Test `fromZodSafeParse()` with validation errors
- [ ] Test `fromZodSchema()` convenience wrapper
- [ ] Test complex Zod schemas (nested objects, arrays, unions, refinements)
- [ ] Verify ValidationError structure matches expected format

#### 3.5 Create `test/observability.test.ts`
- [ ] Test `toLogContext()` serialization
- [ ] Test `toLogContext()` with cause chains (verify recursion)
- [ ] Test `toFlatLogContext()` flattening
- [ ] Test `toSpanAttributes()` OpenTelemetry format
- [ ] Test `toMetricLabels()` Prometheus format
- [ ] Verify all outputs are JSON-serializable

#### 3.6 Update `test/TsRustResult.test.ts`
- [ ] Ensure existing tests still pass (no regressions)
- [ ] Add tests using new error types with existing Result functions
- [ ] Test `map()`, `mapErr()` with DomainError types

---

### Phase 4: Documentation
**Goal**: Comprehensive guides for error philosophy, migration, and integrations

#### 4.1 Create `docs/ERROR_DESIGN.md`
- [ ] Explain why plain objects over Error classes
  - JSON serialization
  - No prototype overhead
  - Structural typing
  - Framework-agnostic
- [ ] Explain discriminated unions for exhaustive error handling
- [ ] Explain when to capture stack traces (critical vs validation errors)
- [ ] Explain builder pattern vs factory shortcuts
- [ ] Include code examples comparing old vs new patterns

#### 4.2 Create `docs/MIGRATION_GUIDE.md`
- [ ] Breaking changes in 2.0.0
  - New error infrastructure (opt-in, doesn't break existing code)
  - Updated TypeScript target (if changed)
- [ ] Step-by-step migration for existing projects
  1. Update to 2.0.0
  2. Import error types: `import { error, fileNotFound } from '@jenova-marie/ts-rust-result/errors'`
  3. Replace ad-hoc error objects with standard types
  4. Update Result<T> to Result<T, SpecificError>
- [ ] Codemods or regex patterns for common migrations
- [ ] Before/after code examples

#### 4.3 Create `docs/SENTRY.md`
- [ ] Setup instructions for Sentry integration
- [ ] Example using `toSentryError()` conversion
  ```typescript
  import * as Sentry from '@sentry/node'
  import { toSentryError } from '@jenova-marie/ts-rust-result/errors'

  const result = loadConfig()
  if (!result.ok) {
    Sentry.captureException(toSentryError(result.error))
  }
  ```
- [ ] Best practices:
  - When to send to Sentry (unexpected errors only)
  - How to set severity levels based on error kind
  - Filtering validation errors (too noisy)
- [ ] Custom Sentry integration for automatic Result error tracking

#### 4.4 Create `docs/OPENTELEMETRY.md`
- [ ] Setup instructions for OpenTelemetry integration
- [ ] Example using `toSpanAttributes()` for tracing
  ```typescript
  import { trace } from '@opentelemetry/api'
  import { toSpanAttributes } from '@jenova-marie/ts-rust-result/observability'

  const span = trace.getActiveSpan()
  const result = performOperation()

  if (!result.ok) {
    span?.setAttributes(toSpanAttributes(result.error))
    span?.recordException(toSentryError(result.error)) // Optional
  }
  ```
- [ ] Propagating errors across service boundaries
- [ ] Distributed tracing with error cause chains

#### 4.5 Create `docs/ZOD.md`
- [ ] Patterns for Zod + Result error handling
- [ ] Example using `fromZodSafeParse()`
  ```typescript
  import { z } from 'zod'
  import { fromZodSafeParse } from '@jenova-marie/ts-rust-result/errors'

  const UserSchema = z.object({
    name: z.string(),
    email: z.string().email()
  })

  function parseUser(data: unknown): Result<User, ValidationError> {
    return fromZodSafeParse(UserSchema.safeParse(data))
  }
  ```
- [ ] Custom Zod error messages
- [ ] Combining Zod validation with other error types

#### 4.6 Update `README.md`
- [ ] Add section on error handling philosophy
- [ ] Show builder pattern examples
- [ ] Show factory shortcut examples
- [ ] Link to detailed docs (ERROR_DESIGN.md, etc.)
- [ ] Update installation instructions (2.0.0)
- [ ] Add "What's New in 2.0" section highlighting error infrastructure

#### 4.7 Create `CHANGELOG.md` entry for 2.0.0
- [ ] Breaking changes (none - purely additive)
- [ ] New features:
  - Opinionated error type system
  - Standard error categories (FileSystem, Parse, Validation, Network, Database, Auth, Config)
  - Builder pattern API (`error().withContext().build()`)
  - Factory shortcuts (`fileNotFound()`, etc.)
  - Stack trace capture (NODE_ENV aware)
  - Error conversion utilities (`fromError()`, `toSentryError()`)
  - Zod integration (`fromZodSafeParse()`)
  - Observability helpers (`toLogContext()`, `toSpanAttributes()`, `toMetricLabels()`)
- [ ] Documentation additions
- [ ] Migration guide link

---

### Phase 5: Package Configuration
**Goal**: Update package.json, TypeScript config, and build setup

#### 5.1 Update `package.json`
- [ ] Bump version to `2.0.0`
- [ ] Add new exports for subpaths:
  ```json
  {
    "exports": {
      ".": {
        "import": "./dist/index.js",
        "types": "./dist/index.d.ts"
      },
      "./errors": {
        "import": "./dist/errors/index.js",
        "types": "./dist/errors/index.d.ts"
      },
      "./observability": {
        "import": "./dist/observability/index.js",
        "types": "./dist/observability/index.d.ts"
      }
    }
  }
  ```
- [ ] Add optional peer dependencies (don't require, but support):
  - `zod` (for Zod integration)
  - `@sentry/node` (for Sentry examples)
  - `@opentelemetry/api` (for OpenTelemetry examples)
- [ ] Update keywords: add "error handling", "domain errors", "observability"

#### 5.2 Update `tsconfig.json`
- [ ] Ensure `strict: true` (already set)
- [ ] Verify `declaration: true` for .d.ts generation
- [ ] Include new source files in compilation
- [ ] Exclude test files from build output

#### 5.3 Update build scripts
- [ ] Ensure `pnpm build` compiles all new source files
- [ ] Verify generated .d.ts files are correct
- [ ] Test subpath imports work correctly:
  ```typescript
  import { ok } from '@jenova-marie/ts-rust-result'
  import { error } from '@jenova-marie/ts-rust-result/errors'
  import { toLogContext } from '@jenova-marie/ts-rust-result/observability'
  ```

---

### Phase 6: Integration Testing
**Goal**: Validate error infrastructure in real-world scenarios

#### 6.1 Create example project
- [ ] Create `examples/` directory with sample app
- [ ] Demonstrate all error types in realistic scenarios
- [ ] Show Sentry integration
- [ ] Show OpenTelemetry integration
- [ ] Show Zod validation
- [ ] Include Pino logging with `toLogContext()`

#### 6.2 Update wonder-logger
- [ ] Replace ad-hoc errors with ts-rust-result 2.0 types
- [ ] Use `ConfigError` for config loading
- [ ] Use `ValidationError` for env var parsing
- [ ] Use `FileSystemError` for file operations
- [ ] Verify logging integration works with `toLogContext()`

#### 6.3 Smoke test in production-like environment
- [ ] Test with `NODE_ENV=production` (no stacks)
- [ ] Test with `NODE_ENV=development` (with stacks)
- [ ] Verify bundle size impact (should be minimal)
- [ ] Verify tree-shaking works (unused error types excluded)

---

## Success Metrics

- [ ] All new code has 100% test coverage
- [ ] All documentation complete and reviewed
- [ ] wonder-logger successfully migrated to 2.0 error types
- [ ] Example project demonstrates all features
- [ ] Published to npm as 2.0.0
- [ ] No regressions in existing Result<T> functionality

---

## Rollout Plan

1. **Complete implementation** (Phases 1-5)
2. **Internal testing** with wonder-logger (Phase 6.2)
3. **Documentation review** (ensure clarity for external users)
4. **Publish 2.0.0-beta.1** to npm
5. **Gather feedback** from early adopters (if any external users)
6. **Publish 2.0.0** stable release
7. **Archive/delete PLAN.md** (goal achieved ✅)

---

## Open Questions

- [ ] Should we include a CLI tool to generate custom error types for projects?
  - `npx ts-rust-result generate-error MyCustomError --fields foo,bar`
- [ ] Should observability helpers support other tracing backends (Datadog, New Relic)?
- [ ] Should we provide ESLint rules to enforce error type usage?
- [ ] Should we create a separate `@jenova-marie/ts-rust-result-react` for React-specific error boundaries?

---

## Notes

- This is a **disposable planning document** - delete after implementation
- Update checkboxes as tasks complete
- Add implementation notes/blockers inline as discovered
- Link to related PRs/commits as work progresses

---

**Last Updated**: 2025-10-21
**Owner**: Jenova Marie (Pippa)
