# MCP Client Installer - Release Checklist

This checklist ensures all release steps are completed before publishing to npm.

## Pre-Release Checks

### 1. Code Quality

- [ ] All tests pass: `pnpm test`
- [ ] No linting errors
- [ ] Code follows project conventions
- [ ] All TODOs resolved or documented
- [ ] No debugging code (console.log, debugger, etc.)

### 2. Documentation

- [ ] README.md is up to date
- [ ] CHANGELOG.md has new version entry
- [ ] API changes documented
- [ ] Architecture docs updated if needed
- [ ] Code comments are accurate

### 3. Version Management

- [ ] Version bumped in package.json
- [ ] Version follows semver:
  - Patch (x.y.Z): Bug fixes only
  - Minor (x.Y.0): New features, backward compatible
  - Major (X.0.0): Breaking changes
- [ ] Git tag created: `git tag v1.x.x`

### 4. Dependencies

- [ ] All dependencies up to date
- [ ] No security vulnerabilities: `npm audit`
- [ ] Dependencies only what's needed
- [ ] Peer dependencies documented

### 5. Package Configuration

- [ ] `package.json` fields complete:
  - name
  - version
  - description
  - main
  - bin
  - repository
  - keywords
  - author
  - license
- [ ] `files` field lists all required files
- [ ] `.npmignore` excludes unnecessary files:
  - tests/
  - .github/
  - .git/
  - node_modules/
  - *.test.js

### 6. Testing

- [ ] Fresh install test:
  ```bash
  cd /tmp
  mkdir test-install
  cd test-install
  npm pack /path/to/mcp-client-installer
  npm install -g ./i18n-agent-mcp-client-*.tgz
  i18n-agent
  ```

- [ ] Test in each supported IDE:
  - [ ] Claude Desktop
  - [ ] Claude Code
  - [ ] Cursor
  - [ ] VS Code
  - [ ] Codex

- [ ] Test on different platforms:
  - [ ] macOS
  - [ ] Linux
  - [ ] Windows (if applicable)

### 7. Security

- [ ] No hardcoded secrets
- [ ] API keys handled securely
- [ ] File permissions correct (0600 for config files)
- [ ] No arbitrary code execution vulnerabilities
- [ ] Input validation in place

## Publishing Process

### 1. Pre-Publish Verification

Run the publishing script:
```bash
./scripts/publish-mcp-client.sh --dry-run
```

This will:
- Verify package.json structure
- Check .npmignore configuration
- Run all tests
- Preview package contents
- Check for uncommitted changes

### 2. Final Checks

- [ ] Clean working directory: `git status`
- [ ] All changes committed
- [ ] On correct branch (usually `main`)
- [ ] Pushed to GitHub: `git push origin main --tags`

### 3. Publish to npm

```bash
# Run pre-publish checks
./scripts/publish-mcp-client.sh

# Publish to npm
npm publish --access public

# Or for scoped packages
npm publish
```

### 4. Verify Publication

- [ ] Check npm page: `https://www.npmjs.com/package/@i18n-agent/mcp-client`
- [ ] Version number correct
- [ ] Description accurate
- [ ] Keywords present
- [ ] README displays correctly

### 5. Test Published Package

```bash
# Install from npm
npm install -g @i18n-agent/mcp-client

# Test installation
i18n-agent

# Test in IDE
# (Follow installation instructions)
```

## Post-Release Steps

### 1. GitHub Release

- [ ] Create GitHub release: `https://github.com/i18n-agent/mcp-client/releases/new`
- [ ] Tag version: `v1.x.x`
- [ ] Title: `Version 1.x.x`
- [ ] Description from CHANGELOG.md
- [ ] Attach any additional assets

### 2. Update Documentation

- [ ] Update docs.i18nagent.ai if needed
- [ ] Update installation guides
- [ ] Update version in examples

### 3. Announcements

- [ ] Post to project Discord/Slack
- [ ] Update website with new version
- [ ] Social media announcement (if major release)
- [ ] Email newsletter (if major release)

### 4. Monitor

- [ ] Check npm download stats
- [ ] Monitor GitHub issues for bug reports
- [ ] Monitor support channels
- [ ] Check error tracking (if applicable)

## Rollback Plan

If issues are discovered after release:

### Minor Issues
1. Create hotfix branch: `git checkout -b hotfix/v1.x.x`
2. Fix issue and test
3. Bump patch version
4. Follow release process
5. Publish new version

### Major Issues
1. Deprecate broken version:
   ```bash
   npm deprecate @i18n-agent/mcp-client@1.x.x "Critical bug, use version 1.y.y instead"
   ```
2. Follow hotfix process above
3. Communicate issue to users

### Critical Issues
1. Unpublish if within 72 hours:
   ```bash
   npm unpublish @i18n-agent/mcp-client@1.x.x
   ```
   ⚠️ Use with extreme caution!

## Release Types

### Patch Release (x.y.Z)
- Bug fixes only
- No new features
- Backward compatible
- Example: 1.0.0 → 1.0.1

**Checklist:**
- [ ] Only bug fixes included
- [ ] Tests pass
- [ ] No breaking changes

### Minor Release (x.Y.0)
- New features
- Backward compatible
- May include bug fixes
- Example: 1.0.0 → 1.1.0

**Checklist:**
- [ ] New features documented
- [ ] Tests for new features
- [ ] Backward compatible
- [ ] Migration guide (if needed)

### Major Release (X.0.0)
- Breaking changes
- May include new features and bug fixes
- Requires migration
- Example: 1.0.0 → 2.0.0

**Checklist:**
- [ ] Breaking changes documented
- [ ] Migration guide written
- [ ] All dependencies updated
- [ ] Extra testing performed
- [ ] Announcement prepared

## Common Issues and Solutions

### "prepublishOnly hook failed"
**Solution**: This is intentional. Use `./scripts/publish-mcp-client.sh` instead of direct `npm publish`.

### "Tests failed"
**Solution**: Fix failing tests before publishing. Never skip tests for releases.

### "Version already exists"
**Solution**: Bump version in package.json. You cannot overwrite published versions.

### "Permission denied"
**Solution**: Login to npm: `npm login`

### "Package size too large"
**Solution**:
1. Check .npmignore excludes unnecessary files
2. Run `npm pack` and inspect contents
3. Remove large files not needed for package

### "Scoped package not public"
**Solution**: Use `npm publish --access public` for first publish of scoped package.

## Automation Opportunities

Future improvements to automate:

1. **CI/CD Pipeline**
   - Automatic testing on commit
   - Automatic publish on tag
   - Automatic changelog generation

2. **Version Bumping**
   - Script to bump version
   - Auto-generate git tags
   - Update CHANGELOG.md

3. **Release Notes**
   - Auto-generate from commits
   - Include PR references
   - Group by type (features, fixes, etc.)

4. **Post-Release**
   - Auto-create GitHub release
   - Auto-tweet new version
   - Auto-update documentation

## Version History Template

Add to CHANGELOG.md after each release:

```markdown
## [1.x.x] - YYYY-MM-DD

### Added
- New feature 1
- New feature 2

### Changed
- Changed behavior 1
- Updated dependency X

### Fixed
- Bug fix 1
- Bug fix 2

### Deprecated
- Old API 1 (will be removed in 2.0.0)

### Removed
- Removed feature X

### Security
- Security fix 1
```

## Final Pre-Publish Command

Run this command before every publish:

```bash
# Complete pre-publish check
./scripts/publish-mcp-client.sh --dry-run && \
pnpm test && \
git status && \
echo "✅ Ready to publish!"
```

If all checks pass, proceed with:

```bash
npm publish --access public
```

## Emergency Contacts

If issues during release:

- **Technical Lead**: [contact info]
- **DevOps**: [contact info]
- **npm Support**: https://www.npmjs.com/support

## References

- [npm Documentation](https://docs.npmjs.com/)
- [Semantic Versioning](https://semver.org/)
- [Keep a Changelog](https://keepachangelog.com/)
- [MCP Specification](https://github.com/modelcontextprotocol/specification)

---

**Remember**: Better to delay a release than to publish a broken version!
