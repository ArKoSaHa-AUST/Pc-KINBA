## Pull Request Description

Explain the changes made in this Pull Request, including the problem being solved, the architectural impact, and how it aligns with the project guidelines.

## Linked Issue References

Fixes # (issue number)

## Type of Change

Please check the options that apply:

- [ ] **fix**: Bug fix (non-breaking change which fixes an issue)
- [ ] **feat**: New feature (non-breaking change which adds functionality)
- [ ] **perf**: Performance optimization
- [ ] **refactor**: Code style/formatting/refactor (no functional changes)
- [ ] **docs**: Documentation updates
- [ ] **build** / **ci**: Build system, Docker setup, or workflow pipeline modifications

---

## Local Verification Checklist

Before requesting review, ensure you have run and verified the following locally:

### 1. Backend (Laravel / PHP)
- [ ] Laravel application starts successfully.
- [ ] All PHPUnit tests pass: `php artisan test`.
- [ ] Code formatting conforms to PSR-12 standards.

### 2. Frontend (React + TS)
- [ ] Frontend builds successfully inside container: `./client-build.sh`.
- [ ] ESLint rules pass cleanly: `npm run lint` in the `client/` folder.
- [ ] Prettier styles conform: `npm run format` in the `client/` folder.
- [ ] TypeScript type checks pass: `npx tsc --noEmit` in the `client/` folder.

### 3. Docker Environment
- [ ] Complete docker-compose environment builds successfully: `docker compose build`.
- [ ] Dockerfiles check passes.

---

## CI/CD Pipeline Checks (Enforced by GitHub)

- [ ] All status checks (`build`, `test`, `lint`, `security`, `docker`, `codeql`) must pass before merge is allowed.
- [ ] Branch is updated and synchronized with target branch (`develop` or `main`).
- [ ] At least 2 approving reviews from code owners are received.
