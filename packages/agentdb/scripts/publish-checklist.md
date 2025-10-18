# Publishing Checklist

Complete this checklist before publishing to npm.

## Pre-Publish

- [ ] All tests pass (`npm test`)
- [ ] Linting passes (`npm run lint`)
- [ ] Type checking passes (`npm run typecheck`)
- [ ] Build succeeds (`npm run build`)
- [ ] Verify installation (`npm run verify`)
- [ ] Version bumped in package.json
- [ ] CHANGELOG.md updated (if exists)
- [ ] README.md is accurate
- [ ] Examples work
- [ ] Documentation is complete

## Package Validation

- [ ] Run `npm publish --dry-run`
- [ ] Check package contents: `npm pack && tar -tzf sqlite-vector-*.tgz`
- [ ] Verify files include:
  - [ ] dist/ directory
  - [ ] bin/ directory
  - [ ] README.md
  - [ ] LICENSE-MIT
  - [ ] LICENSE-APACHE
  - [ ] package.json
- [ ] Verify files exclude:
  - [ ] src/ directory
  - [ ] tests/ directory
  - [ ] node_modules/
  - [ ] .git/

## CLI Testing

- [ ] `npx . help` works
- [ ] `npx . version` shows correct version
- [ ] `npx . init ./test.db` creates database
- [ ] All commands show proper error messages

## Module Testing

```bash
# Create test directory
mkdir ../test-install
cd ../test-install

# Test local install
npm install ../sqlite-vector

# Test import
node -e "const {SqliteVectorDB,Presets}=require('sqlite-vector');console.log('✅ Import works')"

# Test TypeScript types
echo "import { SqliteVectorDB } from 'sqlite-vector';" > test.ts
npx tsc --noEmit test.ts && echo "✅ Types work"

# Cleanup
cd .. && rm -rf test-install
```

## npm Registry

- [ ] Logged in to npm: `npm whoami`
- [ ] Correct npm account
- [ ] 2FA enabled (recommended)
- [ ] Ready to publish

## Publishing

```bash
# Final dry run
npm publish --dry-run

# Publish to npm
npm publish

# Verify on npm
npm info sqlite-vector

# Test installation from npm
npm install -g sqlite-vector
sqlite-vector version
```

## Post-Publish

- [ ] Verify package page: https://www.npmjs.com/package/sqlite-vector
- [ ] Test installation: `npx sqlite-vector@latest version`
- [ ] Update documentation links
- [ ] Announce release (if applicable)
- [ ] Tag release in git: `git tag v1.0.0 && git push --tags`
- [ ] Create GitHub release (if applicable)

## Troubleshooting

If publish fails:

1. Check npm status: https://status.npmjs.org/
2. Verify authentication: `npm login`
3. Check package name availability: `npm search sqlite-vector`
4. Review error message carefully
5. Check .npmignore isn't excluding needed files
6. Ensure package.json is valid: `npm pkg fix`

## Rollback

If you need to unpublish (within 72 hours):

```bash
npm unpublish sqlite-vector@1.0.0
```

⚠️ **WARNING**: Unpublishing is permanent and discouraged. Use deprecation instead:

```bash
npm deprecate sqlite-vector@1.0.0 "Deprecated due to critical bug"
```

## Support

- npm documentation: https://docs.npmjs.com/
- Publishing guide: https://docs.npmjs.com/cli/v9/commands/npm-publish
- Package.json reference: https://docs.npmjs.com/cli/v9/configuring-npm/package-json
