# Feedback integration

`/feedback` searches open issues in `Naphier/music-tools`. Visitors can review
similar tickets; signed-in site accounts can vote once per issue or submit a new
issue with their first vote. No visitor GitHub account is required.

Each saved vote posts a separate GitHub comment whose visible text is:

> username voted for this from the site

The username is taken from the authenticated site account and snapshotted when
the vote is saved. The UI explains that voting publishes this username. Markdown,
control characters and mentions are escaped. A hidden `website-feedback-vote:<id>`
marker identifies the vote for retries and trusted counting. A client-supplied
username cannot impersonate another user. The database primary key allows only
one vote per account per issue; voting is additive in this version.

## Popularity alerts

The alert score is **unique website vote comments + issue-level GitHub 👍 reactions**.
For example, three website comments plus two thumbs-ups reaches the default five.
Other reactions, reactions on comments, unrelated comments, the previous aggregate
count comment, and copied vote comments from other GitHub accounts are excluded.
The same vote marker counts once even after a duplicate remote delivery. Native
GitHub identities and website identities are not linked, so a person can contribute
through both channels as requested by this additive scoring rule.

The `.github/workflows/feedback-alert.yml` workflow posts one separate comment
mentioning the maintainer as `github-actions[bot]`. Existing alert markers suppress
repeats even if the score later drops and grows again. Closed issues and PRs are
excluded. The issue API supplies the current native 👍 count.

A website vote comment triggers an immediate workflow check. GitHub Actions has
no reaction event trigger, so a scheduled scan every 30 minutes checks **all open
issues**, including older issues whose update timestamp did not change. GitHub
can delay scheduled runs. Manual workflow dispatch can target one issue. Native
thumbs-up-only issues can also reach the threshold. Alert emails follow the
maintainer's GitHub notification preferences.

Repository variables on the target repository:

| Variable | Default | Purpose |
| --- | --- | --- |
| `FEEDBACK_VOTE_THRESHOLD` | `5` | Combined-score threshold |
| `FEEDBACK_BOT_LOGIN` | Repository owner | Authenticated user writing website vote comments |
| `FEEDBACK_ALERT_LOGIN` | Repository owner | Maintainer receiving the mention |

Merge the workflow and `.github/scripts/feedback_alert.cjs` into the target's
**default branch**, and enable Actions. The workflow uses its own `GITHUB_TOKEN`
with Contents read and Issues write; the server token needs no Actions permission.
For a dev test target, install the same workflow/script and variables there.

## Server configuration

| Setting | Default | Purpose |
| --- | --- | --- |
| `SR_FEEDBACK_ENABLED` | Disabled | Set to `1` after migrations and credential setup |
| `SR_FEEDBACK_REPO` | `Naphier/music-tools` | Fixed GitHub target |
| `SR_FEEDBACK_THRESHOLD` | `5` | Threshold displayed in the page; match `FEEDBACK_VOTE_THRESHOLD` |
| `SR_FEEDBACK_TOKEN_FILE` | None | Server-only dedicated fine-grained token file |
| `SR_FEEDBACK_TOKEN` | None | Environment alternative; do not set both |

Select only the target repository for the fine-grained token: **Issues read/write**
and automatic **Metadata read** are sufficient. It creates issues and vote comments
and reads existing issues/comments. Keep it on the server, outside repositories,
browser code, build layers and logs. Preserve the authenticated GitHub username
when rotating credentials, or reconcile comments and update `FEEDBACK_BOT_LOGIN`.
Private host provisioning and rollout instructions live in the operations repo.

Run `lapis migrate` before enabling. Migration `1793577600` creates the feedback
tables. Migration `1794960000` adds per-vote delivery IDs and username snapshots,
backfills existing votes from account usernames, and queues them for comment
publication. Previous aggregate comments are left as history and ignored by the
new alert. Earlier popularity alerts continue to prevent repeated notifications.

## Delivery and recovery

Saved votes survive remote failures. A ten-minute per-issue database lease permits
one comment writer at a time. Worker zero retries up to ten pending issues each
minute, posting at most 25 pending vote comments per issue per attempt. Retry
backoff is one minute. Worker restarts recover expired leases. Before posting,
the writer discovers existing trusted vote markers to recover an accepted comment
after an ambiguous timeout or crash before recording its delivery ID. Published
comments are not edited for later username changes. The UI uses temporary toasts
and reports when a saved vote is waiting for its GitHub comment.

GitHub and PostgreSQL cannot share a transaction, so strict exactly-once remote
writes cannot be guaranteed. Stable markers deduplicate alerts even if a comment
is repeated. The writer scans up to 1,000 comments before failing safely for
manual reconciliation; the alert workflow paginates comments without this cap.
Generic retry logs omit credentials, upstream bodies and feedback text.

Issue submissions use UUIDs and five unique daily account slots. An ambiguous
issue-creation timeout is not automatically retried: match the
`website-feedback:<submission id>` marker to its pending submission row, recover
that row's issue number, then retry the same UUID to create the author vote. Do
not delete pending rows or blindly create another ticket. Search is keyword-based
(any of the first five distinct words of at least three letters/digits), not
semantic duplicate detection.

## Verification

The normal CI image runs real disposable PostgreSQL specs with a mocked GitHub
client for account attribution, one vote per account, comment retries, expired
leases and issue creation. `node --test .github/scripts/feedback_alert.test.cjs`
checks mixed/native-only scores, trusted markers, pagination paths, thresholds,
repeat suppression and failures without network access. Feedback requires the
full backend; the frontend-only preview shows an availability message.
