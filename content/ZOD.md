# Zod Integration Guide

Complete guide for integrating ts-rust-result with Zod schema validation.

## Table of Contents

- [Quick Start](#quick-start)
- [Installation](#installation)
- [Converting Zod Results](#converting-zod-results)
- [Patterns](#patterns)
- [Best Practices](#best-practices)
- [Examples](#examples)

---

## Quick Start

```typescript
import { z } from 'zod'
import { fromZodSafeParse } from '@jenova-marie/ts-rust-result/errors'

const UserSchema = z.object({
  name: z.string(),
  email: z.string().email()
})

function validateUser(data: unknown): Result<User, ValidationError> {
  return fromZodSafeParse(UserSchema.safeParse(data))
}

const result = validateUser({ name: 'Alice' }) // Missing email
if (!result.ok) {
  // result.error.kind === 'SchemaValidation'
  // result.error.context.issues contains detailed validation errors
}
```

---

## Installation

```bash
npm install zod
# or
pnpm add zod
```

Zod is an **optional peer dependency** of ts-rust-result. You only need it if you're using the Zod integration features.

---

## Converting Zod Results

### fromZodSafeParse()

Converts Zod's `SafeParseReturnType` to `Result<T, ValidationError>`.

```typescript
import { z } from 'zod'
import { fromZodSafeParse } from '@jenova-marie/ts-rust-result/errors'

const schema = z.string().email()
const zodResult = schema.safeParse('not-an-email')

const result = fromZodSafeParse(zodResult)
// Result<string, ValidationError>

if (!result.ok) {
  console.log(result.error.kind) // 'SchemaValidation'
  console.log(result.error.message) // 'Validation failed: 1 issue(s)'
  console.log(result.error.context.issues)
  // [
  //   {
  //     path: [],
  //     message: 'Invalid email'
  //   }
  // ]
}
```

### fromZodSchema()

Convenience wrapper that calls `safeParse()` and converts in one step.

```typescript
import { fromZodSchema } from '@jenova-marie/ts-rust-result/errors'

const ConfigSchema = z.object({
  port: z.number().min(1).max(65535),
  host: z.string(),
  debug: z.boolean()
})

// One-liner validation
const result = fromZodSchema(ConfigSchema, rawData)
// Result<Config, ValidationError>
```

---

## Patterns

### Pattern 1: Function Input Validation

```typescript
import { z } from 'zod'
import { fromZodSchema, type Result, type ValidationError } from '@jenova-marie/ts-rust-result'

const CreateUserSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  age: z.number().int().min(18)
})

type CreateUserInput = z.infer<typeof CreateUserSchema>

function createUser(data: unknown): Result<User, ValidationError | DatabaseError> {
  // Validate input
  const validationResult = fromZodSchema(CreateUserSchema, data)
  if (!validationResult.ok) {
    return validationResult
  }

  // Use validated data (type-safe!)
  const validated: CreateUserInput = validationResult.value

  // Save to database
  return saveUser(validated)
}
```

### Pattern 2: Config File Validation

```typescript
import { z } from 'zod'
import { fromZodSchema } from '@jenova-marie/ts-rust-result/errors'

const ConfigSchema = z.object({
  server: z.object({
    port: z.number().default(3000),
    host: z.string().default('localhost')
  }),
  database: z.object({
    url: z.string().url(),
    poolSize: z.number().default(10)
  }),
  features: z.object({
    auth: z.boolean().default(true),
    logging: z.boolean().default(true)
  })
})

type Config = z.infer<typeof ConfigSchema>

function loadConfig(path: string): Result<Config, FileSystemError | ValidationError> {
  // Load file
  const fileResult = loadFile(path)
  if (!fileResult.ok) return fileResult

  // Parse JSON
  let json: unknown
  try {
    json = JSON.parse(fileResult.value)
  } catch (e) {
    return err(invalidJSON(fileResult.value, String(e)) as any)
  }

  // Validate schema
  return fromZodSchema(ConfigSchema, json)
}
```

### Pattern 3: API Request Validation

```typescript
import express from 'express'
import { z } from 'zod'
import { fromZodSchema } from '@jenova-marie/ts-rust-result/errors'

const CreatePostSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(1),
  tags: z.array(z.string()).optional(),
  published: z.boolean().default(false)
})

app.post('/api/posts', async (req, res) => {
  // Validate request body
  const validationResult = fromZodSchema(CreatePostSchema, req.body)

  if (!validationResult.ok) {
    const error = validationResult.error

    return res.status(400).json({
      error: 'Validation failed',
      issues: error.context.issues
    })
  }

  // Create post with validated data
  const post = await createPost(validationResult.value)
  res.json(post)
})
```

### Pattern 4: Environment Variables

```typescript
import { z } from 'zod'
import { fromZodSchema } from '@jenova-marie/ts-rust-result/errors'

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']),
  PORT: z.string().transform(Number).pipe(z.number().min(1).max(65535)),
  DATABASE_URL: z.string().url(),
  API_KEY: z.string().min(32),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info')
})

type Env = z.infer<typeof EnvSchema>

function loadEnv(): Result<Env, ValidationError> {
  return fromZodSchema(EnvSchema, process.env)
}

// Usage
const envResult = loadEnv()
if (!envResult.ok) {
  console.error('Invalid environment variables:')
  envResult.error.context.issues.forEach(issue => {
    console.error(`  ${issue.path.join('.')}: ${issue.message}`)
  })
  process.exit(1)
}

const env = envResult.value // Type-safe environment
```

---

## Best Practices

### 1. Use Type Inference

```typescript
// ✅ GOOD: Infer types from schema
const UserSchema = z.object({
  name: z.string(),
  email: z.string().email()
})

type User = z.infer<typeof UserSchema>

// ❌ BAD: Manually defining types
type User = {
  name: string
  email: string
}
const UserSchema = z.object({ ... }) // Can get out of sync
```

### 2. Provide Custom Error Messages

```typescript
const UserSchema = z.object({
  name: z.string({
    required_error: 'Name is required',
    invalid_type_error: 'Name must be a string'
  }).min(1, 'Name cannot be empty'),

  email: z.string().email('Invalid email address'),

  age: z.number()
    .int('Age must be a whole number')
    .min(18, 'Must be at least 18 years old')
})
```

### 3. Use Transforms for Data Normalization

```typescript
const UserSchema = z.object({
  email: z.string()
    .email()
    .transform(email => email.toLowerCase().trim()),

  name: z.string()
    .transform(name => name.trim()),

  age: z.string()
    .transform(Number)
    .pipe(z.number().int().min(0))
})
```

### 4. Don't Skip Stack Traces for Validation

```typescript
// Validation errors automatically skip stack traces (factory default)
const error = schemaValidation(issues)
// error.stack === undefined

// If you need a stack for debugging validation:
const errorWithStack = error('SchemaValidation')
  .withMessage('Validation failed')
  .withContext({ issues })
  .captureStack() // Force capture
  .build()
```

### 5. Compose Schemas

```typescript
// Reusable schemas
const EmailSchema = z.string().email()
const PasswordSchema = z.string().min(8).max(100)
const TimestampSchema = z.number().int().positive()

// Compose into larger schemas
const UserSchema = z.object({
  email: EmailSchema,
  password: PasswordSchema,
  createdAt: TimestampSchema
})

const LoginSchema = z.object({
  email: EmailSchema,
  password: PasswordSchema
})
```

---

## Examples

### Example 1: Form Validation

```typescript
import { z } from 'zod'
import { fromZodSchema } from '@jenova-marie/ts-rust-result/errors'

const SignupFormSchema = z.object({
  username: z.string()
    .min(3, 'Username must be at least 3 characters')
    .max(20, 'Username must be at most 20 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),

  email: z.string().email('Invalid email address'),

  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),

  confirmPassword: z.string()
}).refine(data => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword']
})

function handleSignup(formData: unknown) {
  const result = fromZodSchema(SignupFormSchema, formData)

  if (!result.ok) {
    // Display validation errors to user
    const errors = new Map<string, string>()

    result.error.context.issues.forEach(issue => {
      const field = issue.path.join('.')
      errors.set(field, issue.message)
    })

    return { success: false, errors }
  }

  // Proceed with signup
  return createUser(result.value)
}
```

### Example 2: Database Model Validation

```typescript
import { z } from 'zod'
import { fromZodSchema } from '@jenova-marie/ts-rust-result/errors'

const ProductSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  price: z.number().positive(),
  currency: z.enum(['USD', 'EUR', 'GBP']).default('USD'),
  stock: z.number().int().min(0).default(0),
  categories: z.array(z.string()).min(1),
  metadata: z.record(z.unknown()).optional(),
  createdAt: z.date(),
  updatedAt: z.date()
})

type Product = z.infer<typeof ProductSchema>

async function createProduct(data: unknown): Promise<Result<Product, ValidationError | DatabaseError>> {
  // Validate input
  const validationResult = fromZodSchema(ProductSchema, {
    ...data,
    id: crypto.randomUUID(),
    createdAt: new Date(),
    updatedAt: new Date()
  })

  if (!validationResult.ok) {
    return validationResult
  }

  // Save to database
  return await db.products.insert(validationResult.value)
}
```

### Example 3: API Response Validation

```typescript
import { z } from 'zod'
import { fromZodSafeParse, tryResultSafe } from '@jenova-marie/ts-rust-result/errors'

const APIResponseSchema = z.object({
  data: z.object({
    id: z.number(),
    name: z.string(),
    email: z.string().email()
  }),
  meta: z.object({
    page: z.number(),
    total: z.number()
  })
})

type APIResponse = z.infer<typeof APIResponseSchema>

async function fetchUser(id: number): Promise<Result<APIResponse, NetworkError | ValidationError>> {
  // Fetch data
  const fetchResult = await tryResultSafe(async () => {
    const response = await fetch(`https://api.example.com/users/${id}`)
    return await response.json()
  })

  if (!fetchResult.ok) {
    return fetchResult as Result<never, NetworkError>
  }

  // Validate response schema
  const validationResult = fromZodSafeParse(
    APIResponseSchema.safeParse(fetchResult.value)
  )

  if (!validationResult.ok) {
    logger.error(
      { response: fetchResult.value, issues: validationResult.error.context.issues },
      'API response validation failed'
    )
  }

  return validationResult
}
```

### Example 4: File Upload Validation

```typescript
import { z } from 'zod'
import { fromZodSchema } from '@jenova-marie/ts-rust-result/errors'
import multer from 'multer'

const FileUploadSchema = z.object({
  filename: z.string().min(1).max(255),
  mimetype: z.enum(['image/jpeg', 'image/png', 'image/gif', 'image/webp']),
  size: z.number().max(5 * 1024 * 1024, 'File size must be less than 5MB'),
  buffer: z.instanceof(Buffer)
})

app.post('/api/upload', upload.single('image'), (req, res) => {
  const file = req.file

  const validationResult = fromZodSchema(FileUploadSchema, file)

  if (!validationResult.ok) {
    return res.status(400).json({
      error: 'Invalid file upload',
      issues: validationResult.error.context.issues
    })
  }

  // Process validated file
  const processedFile = processImage(validationResult.value)
  res.json({ url: processedFile.url })
})
```

### Example 5: Complex Nested Validation

```typescript
import { z } from 'zod'
import { fromZodSchema } from '@jenova-marie/ts-rust-result/errors'

const AddressSchema = z.object({
  street: z.string(),
  city: z.string(),
  state: z.string().length(2),
  zip: z.string().regex(/^\d{5}(-\d{4})?$/)
})

const OrderItemSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().int().min(1),
  price: z.number().positive()
})

const OrderSchema = z.object({
  orderId: z.string().uuid(),
  customerId: z.string().uuid(),
  items: z.array(OrderItemSchema).min(1, 'Order must contain at least one item'),
  shippingAddress: AddressSchema,
  billingAddress: AddressSchema.optional(),
  total: z.number().positive(),
  status: z.enum(['pending', 'processing', 'shipped', 'delivered', 'cancelled'])
}).refine(
  data => {
    // Validate total matches sum of items
    const itemsTotal = data.items.reduce((sum, item) => sum + (item.price * item.quantity), 0)
    return Math.abs(itemsTotal - data.total) < 0.01 // Allow for floating point errors
  },
  { message: 'Order total does not match item prices' }
)

function validateOrder(data: unknown): Result<Order, ValidationError> {
  return fromZodSchema(OrderSchema, data)
}
```

---

## Combining with Other Validators

### With Custom Validators

```typescript
import { z } from 'zod'
import { fromZodSchema, error } from '@jenova-marie/ts-rust-result/errors'

function validateUser(data: unknown): Result<User, ValidationError> {
  // First, run Zod validation
  const zodResult = fromZodSchema(UserSchema, data)
  if (!zodResult.ok) {
    return zodResult
  }

  const user = zodResult.value

  // Then, run custom business logic validation
  if (await usernameExists(user.username)) {
    return err(
      error('ValidationError')
        .withMessage('Username already exists')
        .withContext({
          issues: [{ path: ['username'], message: 'This username is taken' }]
        })
        .skipStack()
        .build() as any
    )
  }

  return ok(user)
}
```

---

## Testing

### Testing Validation

```typescript
import { describe, it, expect } from '@jest/globals'
import { fromZodSchema } from '@jenova-marie/ts-rust-result/errors'

describe('UserSchema validation', () => {
  it('should accept valid user data', () => {
    const result = fromZodSchema(UserSchema, {
      name: 'Alice',
      email: 'alice@example.com',
      age: 25
    })

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.name).toBe('Alice')
    }
  })

  it('should reject invalid email', () => {
    const result = fromZodSchema(UserSchema, {
      name: 'Alice',
      email: 'not-an-email',
      age: 25
    })

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.kind).toBe('SchemaValidation')
      expect(result.error.context.issues).toHaveLength(1)
      expect(result.error.context.issues[0].path).toEqual(['email'])
    }
  })

  it('should reject missing required fields', () => {
    const result = fromZodSchema(UserSchema, {
      name: 'Alice'
    })

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.context.issues.length).toBeGreaterThan(0)
    }
  })
})
```

---

## Related Documentation

- [Error Design Philosophy](./ERROR_DESIGN.md)
- [Validation Patterns](./README.md#validation)
- [API Documentation](./README.md)

---

## Resources

- [Zod Documentation](https://zod.dev/)
- [Zod GitHub](https://github.com/colinhacks/zod)
- [TypeScript Type Inference](https://www.typescriptlang.org/docs/handbook/type-inference.html)
