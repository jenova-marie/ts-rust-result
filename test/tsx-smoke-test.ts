#!/usr/bin/env tsx
/**
 * tsx Smoke Test
 *
 * Simple standalone script to verify tsx can execute imports from the package.
 * Run with: pnpm tsx test/tsx-smoke-test.ts
 */

import { ok, err, type Result } from '../src/index.js'

console.log('🧪 tsx smoke test starting...')

// Test basic imports
console.log('✓ Imports successful')
console.log('  - typeof ok:', typeof ok)
console.log('  - typeof err:', typeof err)

// Test basic usage
const successResult = ok(42)
console.log('✓ ok() works:', successResult)

const errorResult = err(new Error('test'))
console.log('✓ err() works:', errorResult)

// Test type guards
if (successResult.ok) {
  console.log('✓ Type guard works, value:', successResult.value)
}

console.log('\n✅ tsx smoke test passed!')
