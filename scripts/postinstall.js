#!/usr/bin/env node

/**
 * Post-install script to inform users about available documentation
 * This runs after npm/pnpm/yarn install
 */

const fs = require('fs')
const path = require('path')

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m'
}

const { cyan, green, yellow, blue, magenta, bright, reset } = colors

// Check if we're in CI or should suppress output
const isCi = process.env.CI === 'true' || process.env.CONTINUOUS_INTEGRATION === 'true'
const suppressPostinstall = process.env.SUPPRESS_POSTINSTALL === 'true'

if (isCi || suppressPostinstall) {
  process.exit(0)
}

const packageRoot = path.join(__dirname, '..')
const docExists = fs.existsSync(path.join(packageRoot, 'DOCUMENTATION.md'))

if (!docExists) {
  // If DOCUMENTATION.md doesn't exist, silently exit (dev install scenario)
  process.exit(0)
}

console.log(`
${cyan}╔═══════════════════════════════════════════════════════════════════╗
║                                                                   ║
║  ${bright}📚 @jenova-marie/ts-rust-result${reset}${cyan} - Documentation Available!  ${cyan}║
║                                                                   ║
╚═══════════════════════════════════════════════════════════════════╝${reset}

${green}✨ Complete documentation is included in this package!${reset}

${bright}Quick Start:${reset}
  ${yellow}→${reset} ${blue}node_modules/@jenova-marie/ts-rust-result/DOCUMENTATION.md${reset}

${bright}Key Resources:${reset}
  📖 ${cyan}README.md${reset}           - Quick start & examples
  📜 ${cyan}CHANGELOG.md${reset}         - Version history & migrations
  🎯 ${cyan}content/PATTERNS.md${reset}  - Common patterns & best practices
  🏗️  ${cyan}content/ERROR_DESIGN.md${reset} - Domain error architecture
  🔍 ${cyan}docs/index.html${reset}      - Full API reference (open in browser)

${bright}Integration Guides:${reset}
  🔭 ${magenta}content/OPENTELEMETRY.md${reset} - OpenTelemetry integration
  🐛 ${magenta}content/SENTRY.md${reset}        - Sentry error reporting
  ✅ ${magenta}content/ZOD.md${reset}           - Zod validation

${bright}View API docs in your browser:${reset}
  ${yellow}cd node_modules/@jenova-marie/ts-rust-result/docs${reset}
  ${yellow}npx http-server -p 8080${reset}
  ${yellow}# Then open: http://localhost:8080${reset}

${green}For the complete documentation index, see:${reset}
  ${bright}${blue}DOCUMENTATION.md${reset} ${green}in the package root${reset}

${cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${reset}
`)
