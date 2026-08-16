# Contributing to PCBuilder Bangladesh

Welcome! We appreciate your support in making PCBuilder Bangladesh a production-grade PC component price comparison and AI recommendation platform.

---

## 1. Branch Strategy (Git Flow)

To protect production stability, we follow a strict **Git Flow** branch management strategy:

*   **`main`**: Production code only. Direct commits are blocked. Code enters only via approved Pull Requests from `release/*` or `hotfix/*` branches.
*   **`develop`**: Master integration branch. Daily development work converges here. Direct commits are blocked. Code enters via PRs from `feature/*` or `bugfix/*`.
*   **`feature/*`**: Dedicated branch for new features (e.g., `feature/ai-recommender`). Merges into `develop`.
*   **`bugfix/*`**: Non-production bug fixes (e.g., `bugfix/eslint-warning`). Merges into `develop`.
*   **`hotfix/*`**: Immediate patches for production bugs. Branches from `main` and merges back into both `main` and `develop`.
*   **`release/*`**: Pre-production preparation branch (e.g., `release/v1.1.0`). Branches from `develop` and merges into both `main` and `develop` when tagged.

---

## 2. Commit Message Conventions

We enforce **Conventional Commits** format. Commits must follow this pattern:

```
<type>(<scope>): <short description>
```

### Supported Types:
*   `feat`: A new feature (e.g., `feat(api): add price scraper background service`)
*   `fix`: A bug fix (e.g., `fix(client): fix compatibility checker rendering issue`)
*   `docs`: Documentation changes (e.g., `docs: update CONTRIBUTING.md`)
*   `style`: Code style modifications (formatting, semi-colons, trailing spaces)
*   `refactor`: Refactoring code structure (no functional/API changes)
*   `perf`: Performance optimizations
*   `test`: Adding missing tests or correcting existing tests
*   `build` / `ci`: Packaging configuration, docker, or GitHub actions updates
*   `chore`: Regular maintenance tasks

---

## 3. Pull Request Guidelines

1.  **Sync Branch**: Keep your branch up to date with the target branch (`develop` or `main`). Resolve all merge conflicts locally before pushing.
2.  **Lint Check**: Ensure ESLint, Prettier, and PHP CS Fixer run cleanly locally with zero warnings or errors.
3.  **Run Tests**: Verify all unit and integration tests pass successfully:
    ```bash
    php artisan test
    ```
4.  **Open PR**: Use the provided pull request template and request review from CODEOWNERS. At least **2 approvals** are required before merging.
