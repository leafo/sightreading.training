const {test} = require("node:test")
const assert = require("node:assert/strict")
const notify = require("./feedback_alert.cjs")
const comment = (id, username = `user${id}`, login = "Naphier") => ({
  user: {login}, body: `${username} voted for this from the site\n\n<!-- website-feedback-vote:${id} -->`
})
function fixture(websiteVotes = 3, thumbs = 2) {
  const comments = Array.from({length: websiteVotes}, (_, i) => comment(i + 1))
  const created = []
  const issue = {number: 12, state: "open", reactions: {"+1": thumbs, heart: 99, "-1": 99}}
  const context = {repo: {owner: "Naphier", repo: "music-tools"}, eventName: "issue_comment",
    payload: {issue: {number: 12}, comment: comments[0] || comment(100)}}
  const github = {rest: {issues: {
    listComments() {}, listForRepo() {}, get: async () => ({data: issue}),
    createComment: async data => {created.push(data); comments.push({user: {login: "github-actions[bot]"}, body: data.body})}
  }}}
  github.paginate = async (method, params) => {
    if (method === github.rest.issues.listForRepo) {
      assert.equal(params.state, "open")
      return [issue, {number: 13, pull_request: {}}]
    }
    assert.equal(method, github.rest.issues.listComments)
    return comments
  }
  return {github, context, core: {info() {}}, env: {}, comments, created, issue}
}
test("three site comments plus two thumbs alert at five, once", async () => {
  const f = fixture()
  await notify(f); await notify(f)
  assert.equal(f.created.length, 1)
  assert.match(f.created[0].body, /@Naphier/)
  assert.match(f.created[0].body, /\*\*5 votes\*\*: 3 website vote comments \+ 2 GitHub 👍/)
  f.comments.push(comment(4)); f.issue.reactions["+1"]++
  await notify(f); assert.equal(f.created.length, 1)
})
test("four total votes stay below the default threshold; other emojis do not count", async () => {
  const f = fixture(2, 2); await notify(f); assert.equal(f.created.length, 0)
})
test("website-only and native-only totals both count", async () => {
  for (const f of [fixture(5, 0), fixture(0, 5)]) {
    f.context.eventName = "schedule"; f.context.payload = {}
    await notify(f); assert.equal(f.created.length, 1)
  }
})
test("duplicate vote IDs, spoofed authors, text without a marker, and malformed markers are ignored", async () => {
  const f = fixture(1, 2)
  f.comments.push(comment(1), comment(2, "fake", "attacker"),
    {user: {login: "Naphier"}, body: "otheruser voted for this from the site"},
    {user: {login: "Naphier"}, body: "username\nvoted for this from the site\n\n<!-- website-feedback-vote:2 -->"},
    comment(0), {user: {login: "Naphier"}, body: "<!-- website-feedback-votes -->\n**Website upvotes: 100**"})
  await notify(f); assert.equal(f.created.length, 0)
})
test("does not run from untrusted comment events or PRs", async () => {
  const other = fixture(); other.context.payload.comment = comment(9, "fake", "attacker")
  const pr = fixture(); pr.context.payload.issue.pull_request = {}
  const text = fixture(); text.context.payload.comment = {user: {login: "Naphier"}, body: "arbitrary feedback"}
  for (const f of [other, pr, text]) {await notify(f); assert.equal(f.created.length, 0)}
})
test("scheduled recovery includes older issues and notices a newly added native thumbs-up", async () => {
  const f = fixture(3, 1); f.context.eventName = "schedule"; f.context.payload = {}
  await notify(f); assert.equal(f.created.length, 0)
  f.issue.reactions["+1"] = 2
  await notify(f); await notify(f); assert.equal(f.created.length, 1)
})
test("honors configured threshold, writer and alert recipient", async () => {
  const f = fixture(2, 2); f.env = {FEEDBACK_VOTE_THRESHOLD: "4", FEEDBACK_BOT_LOGIN: "site-bot", FEEDBACK_ALERT_LOGIN: "maintainer"}
  f.comments.forEach(c => c.user.login = "site-bot")
  await notify(f); assert.match(f.created[0].body, /@maintainer/)
})
test("closed issues and PRs are not alerted, including manual checks", async () => {
  for (const flags of [{state: "closed"}, {pull_request: {}}]) {
    const f = fixture(); Object.assign(f.issue, flags)
    f.context.eventName = "workflow_dispatch"; f.context.payload = {inputs: {issue_number: "12"}}
    await notify(f); assert.equal(f.created.length, 0)
  }
})
test("manual recovery and threshold settings reject invalid input", async () => {
  const f = fixture(); f.context.eventName = "workflow_dispatch"; f.context.payload = {inputs: {issue_number: "not-a-number"}}
  await assert.rejects(notify(f), /Invalid issue number/)
  for (const value of ["0", "-1", "1.5", "bad", "Infinity"]) {
    const bad = fixture(); bad.env.FEEDBACK_VOTE_THRESHOLD = value
    await assert.rejects(notify(bad), /Invalid feedback vote threshold/)
  }
})
test("failed alert delivery can retry without counting the alert as a vote", async () => {
  const f = fixture(); const send = f.github.rest.issues.createComment
  f.github.rest.issues.createComment = async () => {throw new Error("temporary outage")}
  await assert.rejects(notify(f), /temporary outage/)
  f.github.rest.issues.createComment = send
  await notify(f); assert.equal(f.created.length, 1)
})
