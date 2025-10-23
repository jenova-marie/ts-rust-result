# 🛠️ Development Workflow Guide

This guide explains the correct workflow for developing, documenting, and publishing `@jenova-marie/ts-rust-result`.

## 📚 Documentation Philosophy

**We commit `docs/` to git** because:
- ✅ Docs are version-controlled alongside code
- ✅ Users can browse docs on GitHub without installing
- ✅ GitHub Pages can serve docs directly from repo
- ✅ Transparency - see exactly what ships with each version
- ✅ Small size (~200KB) - not a repo bloat concern

## 🔄 Development Workflow

### 1. Making Code Changes

```bash
# Create feature branch
git checkout -b feature/new-api

# Make your changes
vim src/index.ts
vim src/errors/factories.ts

# Run tests as you develop
pnpm test:watch
```

### 2. Regenerating Documentation

**IMPORTANT**: After code changes, regenerate docs:

```bash
# Regenerate TypeDoc documentation
pnpm docs
```

This updates `docs/` to reflect your code changes:
- API reference (`docs/index.html`)
- Function signatures
- Type definitions
- JSDoc comments

### 3. Building and Testing

```bash
# Build TypeScript
pnpm build

# Run all tests
pnpm test

# Check test coverage
pnpm test:coverage

# Lint code
pnpm lint
```

### 4. Verifying Documentation is Current

```bash
# Check if docs are up-to-date with code
pnpm docs:check

# Output if current:
✅ Documentation generated in ./docs/

# Output if out of date:
❌ Documentation is out of date! Run: pnpm docs
```

### 5. Committing Changes

**Commit BOTH code and docs together:**

```bash
# Stage source code AND documentation
git add src/ docs/ content/

# Commit with conventional commit message
git commit -m "feat: add new Result helper function"

# Push to GitHub
git push origin feature/new-api
```

## 📦 Publishing Workflow

### Option A: Automated (Recommended)

Use the `make` script for a complete workflow:

```bash
pnpm make
```

This runs:
1. `pnpm docs` - Regenerate documentation
2. `pnpm build` - Compile TypeScript (ESM + CJS)
3. `pnpm test` - Run all tests
4. `npm publish` - Publish to npm (triggers prepublishOnly)

### Option B: Manual

```bash
# 1. Ensure docs are fresh
pnpm docs

# 2. Build the package
pnpm build

# 3. Run tests
pnpm test

# 4. Publish (prepublishOnly hook runs: docs → build → test again)
npm publish
```

## 🔐 Publishing Hooks (Automatic Safety)

These npm hooks **automatically run** during publish:

### `prepublishOnly`
Runs **before** publishing to npm:
```bash
pnpm run docs → pnpm run build → pnpm run test
```

**Why?** Ensures published package has fresh docs/code even if you forgot to run them manually.

### `prepack`
Runs **before** creating the tarball (npm pack):
```bash
pnpm run docs → pnpm run build
```

**Why?** Ensures tarball includes fresh docs/code.

## 🧹 Cleanup Commands

```bash
# Remove compiled code only
pnpm clean

# Remove both compiled code AND docs
pnpm clean:all

# Rebuild from scratch
pnpm clean:all && pnpm docs && pnpm build
```

## 📋 Development Checklist

Before committing:
- [ ] Code changes implemented
- [ ] Tests added/updated
- [ ] `pnpm test` passes
- [ ] `pnpm docs` regenerated
- [ ] `pnpm docs:check` passes
- [ ] Code and docs committed together

Before publishing:
- [ ] Version bumped in `package.json`
- [ ] `CHANGELOG.md` updated
- [ ] All tests passing
- [ ] Documentation current
- [ ] Git tag created (optional but recommended)

## 🎯 Common Scenarios

### Scenario 1: Adding a New Function

```bash
# 1. Implement function
vim src/index.ts

# 2. Add tests
vim test/TsRustResult.test.ts

# 3. Add JSDoc comments to function
# (TypeDoc will extract these)

# 4. Regenerate docs
pnpm docs

# 5. Verify
pnpm build
pnpm test

# 6. Check docs look correct
open docs/index.html

# 7. Commit code + docs
git add src/ test/ docs/
git commit -m "feat: add mapAsync function"
```

### Scenario 2: Updating Content Guides

```bash
# 1. Edit markdown guide
vim content/PATTERNS.md

# 2. Regenerate docs (copies content/ to docs/media/)
pnpm docs

# 3. Commit both
git add content/ docs/
git commit -m "docs: add async pattern examples"
```

### Scenario 3: Fixing Documentation Typos

```bash
# 1. Fix JSDoc comment in source
vim src/index.ts

# 2. Regenerate docs
pnpm docs

# 3. Verify change
open docs/index.html

# 4. Commit
git add src/ docs/
git commit -m "docs: fix typo in unwrap description"
```

## 🚨 Common Mistakes to Avoid

### ❌ DON'T: Commit code without updating docs
```bash
# BAD: Forgot to run pnpm docs
vim src/index.ts
git add src/
git commit -m "feat: new function"
# Result: docs/ out of sync with code!
```

### ✅ DO: Always regenerate docs after code changes
```bash
# GOOD: Regenerate docs
vim src/index.ts
pnpm docs
git add src/ docs/
git commit -m "feat: new function"
# Result: docs/ matches code!
```

### ❌ DON'T: Run clean commands before committing
```bash
# BAD: Deletes docs before commit
pnpm clean:all
git commit -m "feat: new function"
# Result: docs/ deleted from git!
```

### ✅ DO: Clean only dist/, keep docs/
```bash
# GOOD: Only clean compiled output
pnpm clean
# docs/ remains for commit
```

## 📊 File Ownership

### Committed to Git
- ✅ `src/` - Source code
- ✅ `test/` - Tests
- ✅ `content/` - Markdown guides
- ✅ `docs/` - TypeDoc HTML (generated but committed)
- ✅ `scripts/` - Build scripts
- ✅ `package.json` - Package config
- ✅ `README.md`, `CHANGELOG.md`, `LICENSE`

### Gitignored (Generated, not committed)
- ❌ `dist/` - Compiled JavaScript (regenerated on build)
- ❌ `node_modules/` - Dependencies
- ❌ `*.tgz` - npm pack output
- ❌ `coverage/` - Test coverage reports

## 🔍 Verifying Package Contents

Before publishing, verify what will be included:

```bash
# Dry-run pack (doesn't create tarball)
npm pack --dry-run

# Look for:
# ✅ docs/ directory with HTML files
# ✅ content/ directory with .md files
# ✅ dist/ directory with .js/.d.ts files
# ✅ DOCUMENTATION.md
# ✅ README.md, CHANGELOG.md, LICENSE
```

## 🎓 Understanding the Build Pipeline

```
Source Code Changes (src/)
         ↓
    pnpm docs
         ↓
TypeDoc Generates docs/ from src/
         ↓
    pnpm build
         ↓
TypeScript Compiles src/ → dist/
         ↓
    pnpm test
         ↓
   npm publish
         ↓
  prepublishOnly Hook
  (docs → build → test again)
         ↓
    prepack Hook
  (creates tarball with docs/, dist/, content/)
         ↓
  Published to npm Registry
         ↓
  Users install package
         ↓
  postinstall script
  (shows documentation message)
```

## 📝 Scripts Reference

| Script | Purpose | When to Use |
|--------|---------|-------------|
| `pnpm docs` | Generate TypeDoc HTML | After code changes |
| `pnpm docs:check` | Verify docs are current | Before committing |
| `pnpm build` | Compile TypeScript | Before testing |
| `pnpm test` | Run tests | During development |
| `pnpm test:watch` | Run tests in watch mode | Active development |
| `pnpm lint` | Lint TypeScript | Before committing |
| `pnpm clean` | Remove dist/ | Clean rebuild |
| `pnpm clean:all` | Remove dist/ and docs/ | Full clean |
| `pnpm make` | Complete publish workflow | Publishing new version |

## 🔗 Related Documentation

- [DOCUMENTATION.md](./DOCUMENTATION.md) - User-facing documentation index
- [DOCUMENTATION_SETUP.md](./DOCUMENTATION_SETUP.md) - Technical setup details
- [CHANGELOG.md](./CHANGELOG.md) - Version history
- [README.md](./README.md) - Package overview

---

**Key Takeaway**: Always run `pnpm docs` after code changes and commit `docs/` alongside your code! 📚✨
