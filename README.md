# Sight Reading Trainer

## <https://sightreading.training>

![test](https://github.com/leafo/sightreading.training/workflows/test/badge.svg)

[![Twitch Link](http://leafo.net/dump/twitch-banner.svg)](https://www.twitch.tv/moonscript)

A tool for practicing sight reading, learning songs, and training other musical skills in your browser. The successor to <https://github.com/leafo/mursic>.

Learn more on [the guide](https://sightreading.training/about).

![screenshot](http://leafo.net/shotsnb/2016-05-14_16-30-55.png)

## Frontend development

The frontend is a React app that can be developed without the backend (Lua,
PostgreSQL, tup). All you need is Node:

```bash
npm install
npm run dev
```

Then open <http://localhost:3000/>. The dev server bundles with esbuild,
watches for changes, and reloads the page automatically. Backend-only features
(login, stats, the play-along song library) will not function in this mode;
everything else works, including MIDI input and output.

To generate a CSV table of every Note Math interval calculation for review and
include it in a pull request as verification:

```bash
mkdir -p dev/out && npm run --silent note_math_csv > dev/out/note-math.csv
```

## Remote development with GitHub Codespaces

To test a pull-request branch without installing anything locally:

1. Open the pull request on GitHub, select **Code**, then **Codespaces**, and
   create a codespace on the pull-request branch.
2. Wait for the container setup to finish. Locked dependencies are installed and the frontend preview starts
   automatically.
3. If the preview is not running, run `bash dev/start_preview.sh` in the Codespaces terminal.
4. When Codespaces forwards port 3000, select **Open in Browser**. If the
   notification is missed, open the **Ports** panel and use the globe icon next
   to **Sight Reading Trainer**.
5. Visit `/flash-cards/note-math` on the forwarded HTTPS URL.

The forwarded site runs in the codespace; only the browser is local. The
frontend-only limitations below still apply.

The full site build (backend + minified production assets) uses the
[tup](https://gittup.org/tup/) build system, see the Tupfiles in the repo.


## Trainer preferences and hit statistics

Signed-in accounts store trainer preferences in PostgreSQL; guests store them in
localStorage. Configure panel choices, Wait/Scroll mode, speed, keyboard visibility,
and the panel's open state are restored. Account preferences load with the session
and save automatically, with a separate per-account device cache. The page reports
failed account saves and retries when another setting changes or connectivity returns.
Account settings use last-write-wins behavior across devices.

Run `lapis migrate` before deploying this version: the migration adds the
`users.trainer_preferences` JSONB column. Production PostgreSQL must use persistent
storage (a volume or an external database) to retain preferences and existing hit
history across container replacement. The repository's Dockerfile is for CI;
it does not define a persistent production deployment.

Reset clears the current practice session's hits, misses, streak, last streak, and
per-note timing data. It preserves pending uploads and account history. Last streak
shows the most recently ended nonzero streak, including after consecutive misses.
The Stats page reports the best daily hits and average hits per active day across
all account history, grouped using the viewer's timezone offset. An active day has
at least one recorded hit or miss; inactive days are excluded from the average.

### Create a Codespaces preview from the command line

With a personal GitHub CLI login that has Codespaces access:

```bash
gh auth login
gh auth refresh -h github.com -s codespace
bash dev/create_codespace.sh codex/trainer-memory-and-stats
```

The helper reuses a codespace for that branch or creates one using the smallest
available machine, a 30-minute idle timeout and seven-day stopped retention.
Creating or running a codespace consumes your GitHub Codespaces quota. The branch
must already be pushed. Open the printed URL, wait for setup, then use **Ports →
3000 → Open in Browser**. New forwarded ports default to private; verify
**Port Visibility → Private** when reusing a codespace. The devcontainer automatically
starts the preview when the codespace starts; `dev/out/preview.log` contains logs.
When reusing a codespace, update its checkout to the latest branch commit after
preserving any local work. If it predates this devcontainer update, rebuild its container
or run `bash dev/start_preview.sh` manually after updating the checkout.

This is a frontend-only preview. Check guest settings by changing Configure options,
Mode, Speed and keyboard visibility, then reloading. Build a streak, miss a note,
and verify Last Streak stays visible through more misses. Reset should zero the
session counters. Account sync and account Stats need a backend-enabled deployment.
