# Contributing Guide

This document explains how to set up, code, test, review, and release so every contribution meets our Definition of Done (DoD) and passes all CI quality gates.

## Code of Conduct

All contributors must follow the OSU Code of Conduct.
We value professionalism, inclusivity, and respect in all communications. If issues arise, report them to the Team Facilitator (Wesley Trieu) or instructor privately.

Definition of Done (DoD):
- Meet acceptance criteria and not regress exisitng behavior.
- Include tests (unit + integration).
- Pass all CI quality gates (lint, types, tests, a11y, perf, deps, etc.)
- Update docs (README, API docs, CHANGELOG) and screenshots for UI.
- Be reviewed and approved per Pull Requests & Reviews guidelines.

## Getting Started

### Prerequisites
1. Node.js (install via: https://nodejs.org)
2. Docker Desktop (install via: https://www.docker.com/products/docker-desktop)

### Local Setup Steps
1. Run `sed -i 's/\r$//' wait-for.sh` to remove whitespaces.
2. Run `mv .env.local .env`. to rename .env
3. Run `bash make_containers_NO_API.sh` to retrieve the database needed from MySQL.
4. Run `docker stop mysql-server-visualization` and `docker stop mysql-server-visual-survey` to stop the databases.
5. Run `docker compose up --build` to run the application.

### How to Run App Locally
In your web browser, visit `http://localhost:5000/` to run the application.
`http://localhost:8000/{VisualizationID}` is an endpoint to test visualizations, and does not write to databases.

### Environment Variables
- Store secrets only in .env (gitignore will ignore this file so it will never be committed).
- Use placeholder values (FAKE_KEY, localhost) in public configs.
m
## Branching & Workflow
If you are implementing a new feature
1. Create a branch from main
2. Commit changes following Conventional Commits
3. Open PR to main when DoD is satisfied
4. Delete branch after merge and done implementing this feature
Small features → rebase; Large features → merge

## Issues & Planning
- File issues in Github Issues, label as type "bug" assign its priority. Put it in the project board
- For new plans, create new issue and label them as "enhancement", put it in the project board

## Commit Messages
We use Conventional Commits: <type>(scope): short summary
example
- feature(UI): added registration page
- fix(UI): fixed bug related to adding user to db
- docs(readme): clarify setup steps

## Code Style, Linting & Formatting
Markdown, tool: markdownlint, command: `npx markdownlint '**/*.md'`, config files: .markdownlint.yml

## Testing
We use Jest for unit/integration tests and Cypress for end-to-end (E2E) tests.
- Unit tests check individual components or functions.
- Integration tests verify modules or API interactions.
- E2E tests simulate full user flows in the browser.

To run locally:
npm test             # Unit + integration (Jest)
npx cypress run      # E2E (headless)
npx cypress open     # E2E (interactive)

Coverage threshold: ≥ 80% for all code.
All new features, bug fixes, or logic changes must include or update tests before merging.

## Pull Requests & Reviews
Use .github/PULL_REQUEST_TEMPLATE.md for PR and link to at least one issue 
PR needs >= 1 review and approval. Reviewers respond within 48 hours

## CI/CD
Continuous Integration:
- Platform: Github Actions
- Config file: '.github/workflows/docker-compose-build.yml'
- verifies that the full application stack builds and runs successfully inside containers

Mandatory Jobs:
1. Lint: Checks Markdown and code style.
2. Build: Ensures containers and app build successfully.
3. Test: Runs Jest + Cypress test suites.

Viewing Logs:
- Navigate to GitHub -> Actions -> Selected Workflow -> “View Logs.”
- Developers can re-run failed jobs using “Re-run jobs.”

Merge Policy:
Only PRs with all checks passing may be merged into main.

## Security & Secrets
Vulnerability Reporting:
- Report any security concerns privately to Wesley Trieu (Team Facilitator) or the instructor.
- Do not disclose vulnerabilities publicly until a patch is released.

Prohibited Practices:
- No hard-coded credentials, API keys, or secrets.
- Never commit .env or any sensitive configuration.

Dependency Management:
- Dependencies reviewed and updated every sprint.
- Run npm audit and npm outdated before merging to detect vulnerabilities.

Scanning Tools:
- GitHub Dependabot Alerts
- npm audit and docker scan for container vulnerabilities.

## Documentation Expectations
Must update when applicable:
- README.md (setup, run, notable changes)
- docs/ (feature guides, architecture)
- API references / OpenAPI schemas
- CHANGELOG.md (user-visible changes)

Docstrings/Comments: Describe why and any invariants/assumptions.

## Release Process
- Versioning: Semantic Versioning (SemVer): MAJOR.MINOR.PATCH
- Tagging: vX.Y.Z
- Changelog: Generated from Conventional Commits (e.g., changesets or conventional-changelog)
- Pipeline: release.yml builds artifacts/images, pushes tags, publishes packages (npm/Docker), and creates GitHub Release notes.
- Rollback: Revert PR or deploy previous tag; DB rollback via migration down scripts.

## Support & Contact
Maintainer Contact:
- Wesley Trieu (Team Facilitator) – via Discord or GitHub mention
- Alternate contact: Instructor (for unresolved or escalated issues)

Response Windows:
- Code review requests: within 48 hours
- Issue triage or bug report acknowledgment: within 2 business days

Questions:
- Open a GitHub Discussion or Issue labeled "question" for technical help.
- General coordination occurs in the team’s Discord channel.
