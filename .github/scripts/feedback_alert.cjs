// Only the integration account's exact, marked vote comments count. A stable
// vote ID deduplicates delivery retries; issue text is never executed.
const votePattern = /^[^\r\n]+ voted for this from the site\n\n<!-- website-feedback-vote:([1-9]\d*) -->$/
module.exports = async function feedbackAlert({github, context, core, env = process.env}) {
  const alertMarker = "<!-- website-feedback-popular -->"
  const writer = env.FEEDBACK_BOT_LOGIN || context.repo.owner
  const recipient = env.FEEDBACK_ALERT_LOGIN || context.repo.owner
  const threshold = Number(env.FEEDBACK_VOTE_THRESHOLD || "5")
  if (!/^[a-zA-Z0-9-]{1,39}$/.test(recipient)) throw new Error("Invalid feedback alert recipient")
  if (!Number.isSafeInteger(threshold) || threshold < 1 || threshold > 100000) throw new Error("Invalid feedback vote threshold")
  let numbers
  if (context.eventName === "issue_comment") {
    const event = context.payload
    if (event.issue.pull_request || event.comment.user.login !== writer || !votePattern.test(event.comment.body || "")) return
    numbers = [event.issue.number]
  } else if (context.payload.inputs?.issue_number) {
    const number = Number(context.payload.inputs.issue_number)
    if (!Number.isSafeInteger(number) || number < 1) throw new Error("Invalid issue number")
    numbers = [number]
  } else {
    // Reactions have no Actions trigger and may not change updated_at. Scan all
    // open issues, including older ones, rather than only recently updated ones.
    const issues = await github.paginate(github.rest.issues.listForRepo, {...context.repo, state: "open", per_page: 100})
    numbers = issues.filter(issue => !issue.pull_request).map(issue => issue.number)
  }
  for (const issue_number of numbers) {
    const {data: issue} = await github.rest.issues.get({...context.repo, issue_number})
    if (issue.pull_request || issue.state !== "open") continue
    const comments = await github.paginate(github.rest.issues.listComments, {...context.repo, issue_number, per_page: 100})
    if (comments.some(comment => comment.user.login === "github-actions[bot]" && (comment.body || "").startsWith(alertMarker))) continue
    const votes = new Set()
    for (const comment of comments) {
      if (comment.user.login !== writer) continue
      const match = (comment.body || "").match(votePattern)
      if (match) votes.add(match[1])
    }
    const thumbs = issue.reactions?.["+1"] ?? 0
    if (!Number.isSafeInteger(thumbs) || thumbs < 0) throw new Error("Invalid issue reaction count")
    const total = votes.size + thumbs
    if (total < threshold) continue
    await github.rest.issues.createComment({...context.repo, issue_number,
      body: `${alertMarker}\n@${recipient} This issue has reached **${total} votes**: ${votes.size} website vote comments + ${thumbs} GitHub 👍 reactions (threshold: ${threshold}).`})
    core.info(`Popularity alert sent for issue #${issue_number}: ${total} votes`)
  }
}
