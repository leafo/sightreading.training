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
2. Wait for the container setup to finish. Dependencies are installed
   automatically.
3. Run `npm run dev` in the Codespaces terminal.
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
