# Napland Music Tools

## <https://music-tools.naplandgames.com>

![test](https://github.com/Naphier/music-tools/workflows/test/badge.svg)

[![Twitch Link](http://leafo.net/dump/twitch-banner.svg)](https://www.twitch.tv/moonscript)

A tool for practicing sight reading, learning songs, and training other musical skills in your browser. The successor to <https://github.com/leafo/mursic>.

Learn more on [the guide](https://music-tools.naplandgames.com/about).

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
   to **Napland Music Tools**.
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

## Authentication sessions

Login, registration and logout refresh the session CSRF token before submitting. Successful authentication loads a fresh page so trainer preferences and statistics start with the current account. Failed logout keeps the current account visible and reports the error. Session-bound HTML and JSON responses use `Cache-Control: no-store`.

Run the authentication transport regressions with `npm run test_auth`; the backend CI also exercises a cookie-preserving login/logout/account-switch sequence.

## Full-backend production runtime

Production requires `SR_STAGE` (`dev` or `prd`), `SR_PUBLIC_URL` (an HTTPS origin
without a trailing slash), `SR_DB_HOST`, `SR_DB_NAME`, `SR_DB_USER`, and the
`SR_DB_PASSWORD` / `SR_SESSION_SECRET` secrets. Each secret may instead be read
from its corresponding `_FILE` path; do not supply both sources. Session secrets
must have at least 32 characters and differ between stages. Secret inputs are
limited to 4096 bytes; file reads are bounded and trim trailing CR/LF. Public
hostnames are validated and normalized to lowercase. Missing production
configuration fails closed. Keep these values outside the repository.

The production process runs in the foreground, uses secure host-only session
cookies, and rejects unexpected Host headers. `GET /_health/ready` checks database
connectivity and the required trainer-preferences schema; it returns 503 without
database error details when unavailable. Internal health clients must send the
configured public hostname in their Host header. Deployment scripts and server
configuration live in the private operations repository.

Backend CI uses the root Dockerfile as a disposable test runner with stable Lapis
and PostgreSQL. Generate assets with `npm ci && npm run build_assets`, then run
`docker build -t sightreading-test .` and `docker run --rm sightreading-test`.
Its database is local to that throwaway container; do not run `ci.sh` on a host.
The script checks an image-only marker before changing PostgreSQL configuration.
It discovers MoonScript specs once, excluding their generated Lua copies. The CI
image uses Debian PostgreSQL 15; the private runtime integration also checks the
production PostgreSQL 17 stack.

## Adding practice tools

Follow the [new-tool playbook](docs/adding-tools.md) for routes, navigation,
state persistence, audio lifecycle, accessibility, verification, and PR previews.

### Drum Machine

Open **Drum Machine** in the navigation or visit `/drum-machine`. Toggle hits across
eight synthesized percussion tracks, choose from ten drum sets, mute instruments, set 30–240 BPM, and add
eighth-note swing. Choose 4/4, 3/4, 5/4, or 6/8 with one or two bars; extending
repeats the first bar. In 6/8, BPM counts dotted quarters; six numbered eighth-note beats each have four
subdivisions (24 cells per bar), with adjustable swing. Eighteen editable presets cover rock, funk, blues, hip-hop, dance, and more.
Use the top-right Your patterns selector and save/new/delete icons to manage up to
100 named patterns on the current browser. New and Save open a naming dialog and preserve the current beat;
confirming selects the named pattern in the dropdown. Saving the same name replaces
it. These patterns are local and do not sync to accounts. Playback uses Web Audio
and stops when leaving the page. No external drum samples or MIDI setup are needed.

Available sets: Classic, Heavy Rock, Woodblocks, Jazz, 808 / Hip-hop, 909 / House,
Industrial, Latin Percussion, Lo-fi, and Taiko / Cinematic. These are synthesized
interpretations; Latin and Taiko display instrument names suited to their sounds.
Press Space to start/stop playback when focus is outside interactive controls.

Drum-set choices are saved with named patterns. Switching sets during playback
keeps the beat running; loading a groove preset retains your selected set.

## Upstream

Music Tools builds on [leafo/sightreading.training](https://github.com/leafo/sightreading.training) by Leaf Corcoran. Original attribution is retained in the source.

The default branch in this fork is `main`; upstream still uses `master`. When incorporating upstream changes, fetch `upstream`, then merge `upstream/master` into a review branch based on `main` and open a pull request targeting this fork’s `main`. The branch names do not need to match.

## Scales and chord exploration

**Scales** (`/scales`, with `/guitar-scales` retained as a redirect) displays a
0–12 guitar fretboard or a two-octave piano from C3 to C5. Choose notes, intervals,
or both; all occurrences of each scale tone are highlighted.

Chord Lab's upper-right gear opens the instrument and display options. Its
fretboard has a reset icon, and chord labels can show notes or degrees. Exact
matches offer common, moveable, and less-common voicings; near matches list notes
to add or remove and offer suggested shapes. Applying a voicing switches to guitar
without clearing the separate piano selection. Chord Reference also groups and
links multiple shapes to the Lab.

Scales, Chord Lab, and Chord Reference automatically save their settings and
selections locally on this browser. They do not sync with accounts or other
devices. Live MIDI notes, open options drawers, and expanded diagram groups are
not restored. Corrupt settings fall back to defaults; denied writes show a
transient warning and retry on the next change.

See the [review checklist](docs/review/scales-chord-usability.md) for manual acceptance.


### Compact chord browsing and diagram export

Chord Lab presents match/suggestion tabs with note letters and shows the selected
chord's returned voicings without foldouts. Piano mode keeps the guitar diagrams
hidden. Reference and Lab share Notes, Fingers, Intervals, and Notes and intervals
diagram options. Each diagram has a Copy as menu for five-fret ASCII blocks or
single-line tabs such as `C = x-3-2-0-1-0`; wide user-entered shapes export as
consecutive five-fret blocks. Clipboard failures can be retried.

Jazz sixth, seventh, and extended chords may omit their natural fifth while
retaining the root, defining third, and other extensions. Such matches and shapes
are marked `no 5`. Ordinary triads and altered fifths still require all tones.
Common grips now include C7 `x-3-2-3-1-x` and major/minor seventh/ninth shells.

See the [completed task list and remaining manual checks](docs/review/chord-ui-task-list.md).

## Website feedback

The Feedback menu opens `/feedback`: search open GitHub issues, upvote a match,
or create an issue after reviewing similar titles. Signed-in accounts get one
website vote per issue. Each vote posts “<username> voted for this from the site”
on GitHub. Website vote comments plus the issue’s native thumbs-up reactions
trigger a single maintainer mention at five total votes. See
[the integration contract](docs/feedback.md) for settings and delivery behavior.
The full backend, migrations and a repository-scoped GitHub credential are required;
the frontend-only preview shows an availability message.


## Returning after login

Login and registration return to the page where authentication started, including
its query and fragment. Shared authentication links carry a local `return_to`
URL through page refreshes, new tabs, and switching between login and registration.
Protected Account and Stats routes use the same flow. External destinations and
auth-page loops fall back to Staff. Authentication still loads a fresh document
to refresh account state and CSRF tokens; logout continues to return to Staff.
