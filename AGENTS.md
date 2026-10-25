<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Team Rules & Protocol

See `shared/PROTOCOL.md` (or `~/hermes-team/shared/PROTOCOL.md`).

## Mandatory Git & Versioning Rules (Trunk-Based, Conventional Commits, SemVer)
1. **Trunk-Based Development**:
   - Single trunk: `main`. No Git Flow (`develop`, `release/*`, `hotfix/*` are strictly forbidden).
   - Short-lived branches (`feat/TASK-###-name`, `fix/BUG-###-name`) < 24-48 hours.
   - Merges to `main` must use squash-and-merge or rebase (linear history).
2. **Conventional Commits**:
   - Commit format: `<type>(<scope>): <subject>` (e.g. `feat(modal): ... [TASK-208]`).
   - Types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`.
   - Imperative, lowercase, no trailing period.
3. **Semantic Versioning (SemVer 2.0.0)**:
   - Releases tagged `vMAJOR.MINOR.PATCH` on `main`.
   - `fix:` -> PATCH, `feat:` -> MINOR, `BREAKING CHANGE:` or `!` -> MAJOR.
4. **Post-Push Deploy Verification Gate (Mandatory)**:
   - Every push to `main` must be monitored via GitHub Actions (`gh run watch` or `gh run list`).
   - All pipeline jobs (Test, Build, Lighthouse, Deploy) must pass with zero errors.
   - If any job fails, STOP immediately. Fix the root cause and ensure a green deploy before proceeding to any new task.

## Karpathy Coding Guidelines (Quality & Anti-Bloat)
1. **Think Before Coding**:
   - State assumptions explicitly. If uncertain or ambiguous, stop and ask rather than guess.
   - Present tradeoffs and push back if a simpler alternative exists.
2. **Simplicity First**:
   - Write the minimum code that solves the problem. No speculative abstractions, single-use interfaces, or unrequested flexibility.
   - If 200 lines can be 50, rewrite simpler.
3. **Surgical Changes**:
   - Touch only what you must. Do not touch or reformat adjacent code, comments, or orthogonal files.
   - Match existing conventions and style. Clean up only your own orphaned imports or variables.
4. **Goal-Driven Execution**:
   - Define verifiable criteria before executing. Loop until verified against tests or explicit checks.

## Role Scopes — absolute (PROTOCOL §10)
Each role writes only inside its own lane. Out-of-lane = Blocker, reverted, task re-issued.

| Role | Writes | Git |
|---|---|---|
| PM | `docs/product/**` | none |
| Lead PM | `docs/reviews/PRD-review-*`, `docs/reviews/DESIGN-review-*` (coverage) | none |
| UI/UX | `design/**` + the Figma file | none |
| Engineer | `src/**`, `tests/**`, `scripts/**`, `config/**`, `docs/tech/**`, `public/**` | add/commit/branch/push on `feat/*`, merge after G4 only |
| Lead Engineer | `docs/reviews/CR-*`, `SPEC-review-*`, `DESIGN-review-*-eng` | read + `switch` for review only |
| QA | `qa/**` | none |
| Orchestrator | `.team/**`, `docs/brief.md`, `AGENTS.md`, `CHANGELOG.md` | docs commits + release tags only |

**The git repository is engineer-team property.** PM, Lead PM, UI/UX, and QA run no git write commands at all — no add, commit, push, pull, merge, rebase, reset, stash, checkout, tag, or branch delete. Read-only inspection is fine.

## Repositories (two, never confused)
- `origin` = `fakhriramdani/my-portfolio-dev` — **private**, source of truth. Full history plus `docs/`, `qa/`, `design/`, `.team/`.
- `public` = `fakhriramdani/my-portfolio` — **public mirror**, code only. Never commit or edit it directly; publish with `scripts/publish-public.sh ["message"]`.
- Git over HTTPS fails in this shell (no askpass helper). Use SSH remotes.
- `docs/`, `qa/`, `design/`, `.team/` must never appear in the public mirror. Verify with `git -C /tmp/... ls-files | grep -E '^(docs|qa|design|\.team)/'` before publishing, or trust the script's exclude list.

Also forbidden to every role: editing `tests/**` or `src/content/**` to make failing output pass (CR first), reviewing your own work, approving a gate you own, hand-editing production (`/var/www/**`, `/etc/nginx/**`), and writing secrets or PII into any artifact.


