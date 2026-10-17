#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p dev/out
# Serialize startup calls from Codespaces lifecycle hooks and manual commands.
exec 9>dev/out/preview.lock
flock -w 60 9
ready() {
  curl --noproxy '*' -fsS --max-time 3 http://127.0.0.1:3000/ | grep -q '<title>Sight Reading Trainer</title>' &&
    curl --noproxy '*' -fsS --max-time 3 http://127.0.0.1:3000/dev/out/main.js -o /dev/null &&
    curl --noproxy '*' -fsS --max-time 3 http://127.0.0.1:3000/dev/out/main.css -o /dev/null
}
if ready 2>/dev/null; then
  echo "Frontend preview is ready on port 3000."
  exit 0
fi
# Do not stop any existing process. A conflicting port will produce a clear error.
nohup node dev/serve.mjs > dev/out/preview.log 2>&1 9>&- &
preview_pid=$!
for ((attempt=0; attempt<60; attempt++)); do
  if ready 2>/dev/null; then
    echo "Frontend preview is ready on port 3000. Open it from the Codespaces Ports panel."
    exit 0
  fi
  if ! kill -0 "$preview_pid" 2>/dev/null; then
    cat dev/out/preview.log >&2
    exit 1
  fi
  sleep 1
done
echo "Preview did not become ready. See dev/out/preview.log." >&2
exit 1
