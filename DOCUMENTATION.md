# 📚 Complete Documentation Guide

Welcome to **@jenova-marie/ts-rust-result**! This document serves as your comprehensive guide to all documentation available in this package.

## 📖 Quick Start

- **[README.md](./README.md)** - Start here! Installation, quick examples, and feature overview
- **[CHANGELOG.md](./CHANGELOG.md)** - Version history, breaking changes, and migration guides

## 🎯 Core Concepts & Patterns

### Essential Reading

1. **[content/PATTERNS.md](./content/PATTERNS.md)** - Common patterns and best practices
   - Function design philosophy
   - Error handling patterns
   - Domain error creation
   - Helper utilities (`createDomainResult`)

2. **[content/ERROR_DESIGN.md](./content/ERROR_DESIGN.md)** - Domain error architecture
   - Why plain objects over Error classes
   - DomainError structure and conventions
   - Creating custom error factories
   - Type-safe error handling

## 🔌 Integration Guides

### Observability & Monitoring

3. **[content/OPENTELEMETRY.md](./content/OPENTELEMETRY.md)** - OpenTelemetry integration
   - Automatic span recording for Results
   - Error tracking and attributes
   - Distributed tracing patterns

4. **[content/SENTRY.md](./content/SENTRY.md)** - Sentry error reporting
   - Converting Results to Sentry events
   - Context enrichment
   - Error grouping strategies

### Validation

5. **[content/ZOD.md](./content/ZOD.md)** - Zod schema validation integration
   - Converting Zod validation errors to Results
   - Type-safe parsing patterns
   - Error normalization

## 🔍 API Reference

### TypeDoc HTML Documentation

The **[docs/](./docs/)** directory contains complete TypeDoc-generated API documentation:

- **[docs/index.html](./docs/index.html)** - Full API reference (open in browser)
  - All functions with detailed signatures
  - Type definitions and generics
  - Usage examples for every function
  - Source code links

### Browsing API Docs

To view the HTML documentation locally:

```bash
# From your project using this package
cd node_modules/@jenova-marie/ts-rust-result
open docs/index.html  # macOS
xdg-open docs/index.html  # Linux
start docs/index.html  # Windows
```

Or use a local server:

```bash
cd node_modules/@jenova-marie/ts-rust-result/docs
npx http-server -p 8080
# Open http://localhost:8080 in your browser
```

## 📂 Documentation Structure

```
@jenova-marie/ts-rust-result/
├── README.md                  # Quick start & overview
├── CHANGELOG.md               # Version history & migration
├── DOCUMENTATION.md           # This file (documentation index)
│
├── content/                   # Deep-dive guides
│   ├── PATTERNS.md            # Usage patterns & best practices
│   ├── ERROR_DESIGN.md        # Domain error architecture
│   ├── OPENTELEMETRY.md       # OpenTelemetry integration
│   ├── SENTRY.md              # Sentry integration
│   └── ZOD.md                 # Zod validation integration
│
└── docs/                      # TypeDoc API reference (HTML)
    ├── index.html             # Main API documentation
    ├── modules.html           # Module exports
    ├── functions/             # Function documentation
    ├── types/                 # Type documentation
    └── media/                 # Markdown copies for web viewing
        ├── PATTERNS.md
        ├── ERROR_DESIGN.md
        ├── OPENTELEMETRY.md
        ├── SENTRY.md
        └── ZOD.md
```

## 🎓 Learning Path

### Beginner

1. Read [README.md](./README.md) for installation and basic usage
2. Review [content/PATTERNS.md](./content/PATTERNS.md) for design philosophy
3. Explore [docs/index.html](./docs/index.html) for API reference

### Intermediate

4. Study [content/ERROR_DESIGN.md](./content/ERROR_DESIGN.md) for custom errors
5. Implement domain-specific helpers from [content/PATTERNS.md](./content/PATTERNS.md)

### Advanced

6. Integrate observability with [content/OPENTELEMETRY.md](./content/OPENTELEMETRY.md)
7. Set up error tracking with [content/SENTRY.md](./content/SENTRY.md)
8. Add validation with [content/ZOD.md](./content/ZOD.md)

## 🆘 Getting Help

- **Issues**: [GitHub Issues](https://github.com/jenova-marie/ts-rust-result/issues)
- **Discussions**: [GitHub Discussions](https://github.com/jenova-marie/ts-rust-result/discussions)
- **API Reference**: [docs/index.html](./docs/index.html)

## 📝 Contributing

See [README.md](./README.md#contributing) for contribution guidelines.

## 📜 License

GPL-3.0 - See [LICENSE](./LICENSE) for details.

---

**Version**: 2.2.4
**Last Updated**: October 2025
**Maintained by**: Jenova Marie
