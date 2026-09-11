# agents.md

## General Principles

- Generate concise, focused solutions for new modules or code.
- Read and understand relevant existing code before making changes.
- Follow the existing project architecture, naming conventions, and patterns.
- Make the smallest change that fully solves the requested problem.
- Do not refactor unrelated code unless required for correctness.
- Do not rename, move, or delete files unless necessary.
- Never overwrite working functionality without a clear reason.
- If requirements are ambiguous and the decision affects architecture,
  data integrity, security, or public APIs, ask before proceeding.
- For minor implementation details, make the safest reasonable assumption
  and document it.
- Do not auto-commit or auto-push changes unless explicitly requested.

## Project Architecture

- Respect the existing project folder structure.
- Keep responsibilities separated between modules.
- Avoid circular dependencies.
- Do not introduce a new architectural pattern when an existing project
  pattern already solves the problem.
- Prefer extending existing modules over creating duplicate functionality.
- Keep business logic separate from UI, transport, and persistence layers
  where the current architecture supports this separation.

## Code Quality

- Choose the simplest correct implementation.
- Prefer readability and maintainability over clever code.
- Keep functions and modules focused on a single responsibility.
- Use clear and descriptive names.
- Avoid unnecessary abstractions.
- Avoid duplicated business logic.
- Use appropriate error handling.
- Handle edge cases that are reasonably expected.
- Add comments only when they explain WHY something exists.
- Do not write comments that merely repeat what the code already says.
- Follow the repository's formatter, linter, and style configuration.

## Dependencies

- Prefer existing project dependencies before adding new ones.
- Do not install a new production dependency unless it provides a clear
  benefit over a simple native implementation.
- Before adding a dependency:
  1. Check whether the project already contains equivalent functionality.
  2. Check whether the standard library or framework already supports it.
  3. Avoid unnecessary or abandoned packages.
- Never remove or upgrade major dependencies without explicit reason.

## Environment Variables

- Never hardcode secrets, API keys, tokens, passwords, or credentials.
- Read environment-specific configuration from environment variables.
- Keep real secrets out of source control.
- Update `.env.example` when introducing a new required environment variable.
- `.env.example` must contain placeholder values only.
- Validate required environment variables during application startup when
  appropriate.
- Reuse existing environment variable naming conventions.
- Do not rename existing environment variables without checking all usages.

## Database

- Preserve existing schemas and data unless the requested task requires a
  schema change.
- Never delete production data.
- Do not perform destructive migrations without explicit approval.
- Prefer backwards-compatible migrations where possible.
- Do not change column meaning or data type without checking existing usages.
- Keep database queries parameterized.
- Avoid unnecessary queries and obvious N+1 query patterns.
- Follow the existing ORM/database access pattern used by the project.

## API Rules

- Preserve existing API contracts unless a breaking change is explicitly
  requested.
- Validate external input.
- Return consistent error formats.
- Do not expose internal errors, secrets, stack traces, or sensitive data
  through API responses.
- Maintain backwards compatibility when practical.
- Update relevant types, schemas, validation, and documentation when an API
  contract changes.

## Error Handling

- Do not silently swallow errors.
- Return or propagate meaningful errors.
- Log useful debugging context without logging secrets or sensitive data.
- Handle expected failures explicitly.
- Do not use broad catch blocks unless there is a clear recovery strategy.

## Testing and Verification

After making changes:

1. Run the relevant formatter.
2. Run the relevant linter.
3. Run type checking if the project uses it.
4. Run tests related to the changed code.
5. Run the broader test suite when practical.
6. Check for obvious regressions.
7. Review the final diff before considering the task complete.

Do not claim that tests passed unless they were actually executed.

If a test cannot be executed, clearly state:
- which test was not run;
- why it could not be run;
- what was verified instead.

## Bug Fixes

When fixing a bug:

1. Identify the root cause before changing code.
2. Avoid patching only the visible symptom.
3. Check whether the same bug pattern exists elsewhere.
4. Add or update a regression test when practical.
5. Avoid unrelated refactors during the bug fix.

## Version Control

- Keep changes focused and atomic.
- Do not modify unrelated files.
- Do not auto-commit.
- Do not auto-push.
- Do not rewrite Git history.
- Do not force-push.
- Do not change branches unless required or explicitly requested.
- Preserve uncommitted user changes.
- Never discard user changes without explicit permission.

When asked to create a commit:
- Use a concise descriptive commit message.
- Prefer conventional commit style when the repository already uses it.

Examples:

feat: add scene timing alignment
fix: prevent duplicate render jobs
refactor: simplify timeline builder
docs: update environment setup

## Security

- Never expose secrets or credentials.
- Never commit `.env` files containing real credentials.
- Sanitize and validate untrusted input.
- Avoid command injection, SQL injection, path traversal, and unsafe dynamic
  execution.
- Do not weaken authentication or authorization to make a feature work.
- Do not disable security checks merely to make tests pass.
- Use least-privilege access where applicable.

## AI-Generated Code Restrictions

- Do not invent APIs, libraries, functions, environment variables, database
  fields, or configuration options.
- Verify that referenced functions, modules, and dependencies actually exist
  in the repository before using them.
- Do not generate fake customer data, real-looking account numbers,
  transactions, credentials, or personal information unless explicitly
  required for safe test fixtures.
- Test fixtures should clearly use fictional placeholder data.
- Do not assume undocumented behavior when the repository can be inspected.
- Do not remove safeguards or validation merely to simplify implementation.

## Documentation

Update documentation when a change affects:

- setup;
- environment variables;
- public APIs;
- configuration;
- user-visible behavior;
- deployment;
- architecture.

Do not create unnecessary documentation for trivial internal changes.

## Definition of Done

A task is complete only when:

- the requested behavior is implemented;
- existing architecture and conventions are respected;
- relevant edge cases are handled;
- no unrelated functionality was changed;
- relevant tests/checks were run when available;
- documentation/config examples were updated when required;
- the final diff was reviewed;
- remaining limitations or assumptions are clearly reported.

## Final Response

After completing a coding task, summarize:

1. What changed.
2. Which files changed.
3. Important implementation decisions.
4. Tests/checks performed.
5. Any remaining issues, assumptions, or recommended follow-up work.

Keep the final response concise.
