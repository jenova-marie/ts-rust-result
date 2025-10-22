# Release Process

This document outlines the release process for `@jenova-marie/ts-rust-result`.

## Prerequisites

1. **NPM Access Token**: Ensure `NPM_TOKEN` secret is configured in GitHub repository settings
   - Go to https://github.com/jenova-marie/ts-rust-result/settings/secrets/actions
   - Add a new repository secret named `NPM_TOKEN`
   - Value should be your npm access token from https://www.npmjs.com/settings/YOUR_USERNAME/tokens

2. **Permissions**: Must have write access to the repository

## Release Workflow

The release process is fully automated via GitHub Actions.

### Step 1: Update Version and Changelog

```bash
# Update package.json version
npm version [major|minor|patch] --no-git-tag-version

# Or manually update version in package.json
# Example: "version": "2.0.0" → "version": "2.1.0"

# Update CHANGELOG.md with release notes
# Add new section for the version with changes
```

### Step 2: Commit Changes

```bash
git add package.json CHANGELOG.md
git commit -m "chore: bump version to 2.1.0"
git push origin main
```

### Step 3: Create and Push Tag

```bash
# Create version tag (must start with 'v')
git tag v2.1.0

# Push tag to trigger release workflow
git push origin v2.1.0
```

### Step 4: Automated Release

Once the tag is pushed, GitHub Actions will automatically:

1. ✅ Run all tests
2. ✅ Build the package
3. ✅ Generate documentation
4. ✅ Verify package.json version matches tag
5. ✅ Publish to npm with public access
6. ✅ Create GitHub Release with notes
7. ✅ Mark as prerelease if version contains `-` (e.g., `v2.1.0-beta.1`)

### Step 5: Verify Release

After the workflow completes:

- Check npm: https://www.npmjs.com/package/@jenova-marie/ts-rust-result
- Check GitHub Releases: https://github.com/jenova-marie/ts-rust-result/releases
- Test installation:
  ```bash
  npm install @jenova-marie/ts-rust-result@latest
  ```

## Version Naming

Follow [Semantic Versioning](https://semver.org/):

- **Major** (2.0.0 → 3.0.0): Breaking changes
- **Minor** (2.0.0 → 2.1.0): New features, backward compatible
- **Patch** (2.0.0 → 2.0.1): Bug fixes, backward compatible
- **Prerelease** (2.1.0-beta.1): Pre-release versions

## Prerelease Workflow

For beta/alpha releases:

```bash
# Update version with prerelease suffix
npm version 2.1.0-beta.1 --no-git-tag-version

# Commit and tag
git add package.json
git commit -m "chore: bump version to 2.1.0-beta.1"
git push origin main
git tag v2.1.0-beta.1
git push origin v2.1.0-beta.1
```

GitHub Actions will automatically mark it as a prerelease.

## Rollback

If a release needs to be rolled back:

1. **Unpublish from npm** (within 72 hours):
   ```bash
   npm unpublish @jenova-marie/ts-rust-result@2.1.0
   ```

2. **Delete GitHub Release**:
   - Go to https://github.com/jenova-marie/ts-rust-result/releases
   - Delete the release

3. **Delete Git Tag**:
   ```bash
   git tag -d v2.1.0
   git push origin :refs/tags/v2.1.0
   ```

## Troubleshooting

### Version Mismatch Error

If the workflow fails with "package.json version does not match tag version":

1. Ensure `package.json` version matches the git tag exactly
2. Tag must be in format `v{version}` (e.g., `v2.1.0`)
3. Package version must be `{version}` (e.g., `2.1.0`)

### npm Publish Failed

1. Check `NPM_TOKEN` secret is valid
2. Verify npm token has publish permissions
3. Check if version already exists on npm
4. Review workflow logs in GitHub Actions

### Tests Failed

The workflow will not publish if tests fail. Fix tests and create a new tag:

```bash
# Fix tests
git add .
git commit -m "fix: failing tests"
git push origin main

# Delete old tag locally and remotely
git tag -d v2.1.0
git push origin :refs/tags/v2.1.0

# Create new tag
git tag v2.1.0
git push origin v2.1.0
```

## CI/CD Pipelines

### Release Workflow (`.github/workflows/release.yml`)
- **Trigger**: Push of `v*` tags
- **Actions**: Test → Build → Publish to npm → Create GitHub Release

### CI Workflow (`.github/workflows/ci.yml`)
- **Trigger**: Push to main/develop, Pull Requests
- **Actions**: Test on multiple OS/Node versions → Generate coverage
- **Matrix**: Ubuntu, macOS, Windows × Node 18, 20, 22

## Manual Release (Emergency)

If GitHub Actions is unavailable:

```bash
# Ensure you're on main with latest code
git checkout main
git pull origin main

# Run tests
pnpm test

# Build
pnpm build

# Generate docs
pnpm docs

# Publish (requires npm login)
npm login
pnpm publish --access public

# Create GitHub release manually
# Go to https://github.com/jenova-marie/ts-rust-result/releases/new
```

## Post-Release Checklist

- [ ] Verify package published to npm
- [ ] Verify GitHub release created
- [ ] Test installation in a clean project
- [ ] Update dependent projects (e.g., wonder-logger)
- [ ] Announce release (if major/minor)
- [ ] Monitor npm download stats
- [ ] Monitor GitHub issues for bugs

## Resources

- [npm Documentation](https://docs.npmjs.com/)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Semantic Versioning](https://semver.org/)
- [Conventional Commits](https://www.conventionalcommits.org/)
