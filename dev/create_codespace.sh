#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
if [[ "${1:-}" == "--help" ]]; then
  echo "Usage: bash dev/create_codespace.sh [branch]"
  echo "Create or reuse a private frontend preview using your GitHub Codespaces quota."
  exit 0
fi
repo=Naphier/sightreading.training
branch=${1:-$(git branch --show-current)}
[[ -n "$branch" ]] || { echo "Specify a pushed branch." >&2; exit 1; }
command -v gh >/dev/null || { echo "Install GitHub CLI and run gh auth login first." >&2; exit 1; }
# Check scoped access before creating a billable resource.
if ! machine=$(gh api "repos/$repo/codespaces/machines" --jq '.machines | sort_by(.cpus, .memory_in_bytes) | .[0].name'); then
  echo "Codespaces access is required. With your personal GitHub CLI login, run: gh auth refresh -h github.com -s codespace" >&2
  exit 1
fi
[[ -n "$machine" && "$machine" != null ]] || { echo "No available Codespaces machine." >&2; exit 1; }
# Reuse an existing preview for this branch, including stopped codespaces.
name=$(gh api --paginate --slurp user/codespaces | node -e '
  let input = ""; process.stdin.on("data", chunk => input += chunk);
  process.stdin.on("end", () => {
    const [repo, branch] = process.argv.slice(1);
    const space = JSON.parse(input).flatMap(page => page.codespaces).find(space =>
      space.repository.full_name === repo && space.git_status.ref === branch && space.state !== "Deleted");
    if (space) process.stdout.write(space.name);
  });
' "$repo" "$branch")
if [[ -z "$name" ]]; then
  name=$(gh api --method POST "repos/$repo/codespaces" \
    -f ref="$branch" -f machine="$machine" \
    -f devcontainer_path=.devcontainer/devcontainer.json \
    -F idle_timeout_minutes=30 -F retention_period_minutes=10080 --jq .name)
  echo "Created codespace: $name"
else
  echo "Reusing codespace: $name"
  echo "Update the checkout to the latest branch commit after preserving any local work."
fi
# Opening a stopped codespace resumes it. postStartCommand launches the app.
echo "Open: https://github.com/codespaces/$name"
echo "After setup finishes, open port 3000 from the Ports panel (set Port Visibility to Private)."
echo "If needed, run: bash dev/start_preview.sh"
echo "This preview has no account backend: test guest settings, reset and Last Streak."
