# Development and test previews

- GitHub Codespaces is the user's established way to test this site. Prefer a
  Codespaces preview when asked to deploy a test version.
- Use the existing checkout: cloud tasks are already isolated. Do not create a
  Git worktree unless explicitly requested.
- The default devcontainer runs the frontend-only React/esbuild workflow on port
  3000. It installs locked dependencies and automatically starts the preview.
  `bash dev/start_preview.sh` can safely check or restart it; logs are in
  `dev/out/preview.log`.
- From a personal GitHub CLI login with Codespaces permission, run
  `bash dev/create_codespace.sh [branch]` to create or reuse a preview. Keep port
  3000 private unless the user explicitly requests public sharing. Codespaces can
  consume the account's quota; use the smallest available machine and an idle
  timeout. Do not delete existing codespaces or user work automatically.
- A frontend-only preview supports guest preferences, session reset and streak
  displays. Account settings sync and account Stats require the Lua/Lapis backend,
  PostgreSQL, and `lapis migrate`; do not claim they work in the default preview.
- The repository Dockerfile runs CI, not a persistent production deployment.
  Production database files must live in persistent storage across deployments.
- Git push and repository API access do not prove Codespaces access. Check the
  specific API permission and report any denial. Never ask for tokens in chat.
