-- GitHub credentials stay on the server. Website votes are separate from native
-- GitHub reactions: one immutable vote per site account, enforced by PostgreSQL.
local db = require('lapis.db')
local util = require('lapis.util')
local assert_error = require('lapis.application').assert_error
local M = {}
local function settings()
  assert_error(os.getenv('SR_FEEDBACK_ENABLED') == '1', 'Feedback is not available yet.')
  local repo = os.getenv('SR_FEEDBACK_REPO') or 'Naphier/music-tools'
  local threshold = tonumber(os.getenv('SR_FEEDBACK_THRESHOLD') or '5')
  assert(repo:match('^[%w_.-]+/[%w_.-]+$'), 'Invalid feedback repository')
  assert(threshold and threshold >= 1 and threshold <= 100000 and threshold % 1 == 0, 'Invalid feedback threshold')
  return {repo = repo, threshold = threshold}
end
local function github(method, path, body)
  settings()
  local token = require('helpers.runtime_config').secret('SR_FEEDBACK_TOKEN')
  local client = require('resty.http').new()
  client:set_timeouts(3000, 5000, 5000)
  local res = client:request_uri('https://api.github.com' .. path, {
    method = method, ssl_verify = true,
    body = body and util.to_json(body) or nil,
    headers = {
      Authorization = 'Bearer ' .. token,
      Accept = 'application/vnd.github+json',
      ['Content-Type'] = 'application/json',
      ['User-Agent'] = 'sightreading-feedback',
      ['X-GitHub-Api-Version'] = '2022-11-28'
    }
  })
  -- Do not expose GitHub error bodies, credentials or network errors to users.
  assert_error(res and res.status >= 200 and res.status < 300,
    'GitHub is temporarily unavailable. Please try again later.')
  local ok, result = pcall(util.from_json, res.body)
  assert_error(ok and type(result) == 'table', 'Invalid response from GitHub.')
  return result
end
local function issue_path(number)
  return '/repos/' .. settings().repo .. '/issues/' .. number
end
local function number_param(value)
  assert_error(type(value) == 'string' and value:match('^%d+$') and #value <= 9,
    'Invalid issue number.')
  local number = tonumber(value)
  assert_error(number > 0, 'Invalid issue number.')
  return number
end
local function text(value, minimum, maximum, name)
  assert_error(type(value) == 'string', 'Invalid ' .. name .. '.')
  value = value:match('^%s*(.-)%s*$')
  assert_error(#value >= minimum and #value <= maximum and not value:find('%z'),
    name .. ' must be ' .. minimum .. '–' .. maximum .. ' characters.')
  return value
end
local function account(ctx)
  assert_error(ctx.current_user, 'Please log in to submit feedback or vote.')
  return ctx.current_user.id
end
local function ensure_open(number)
  local issue = github('GET', issue_path(number))
  assert_error(issue.state == 'open' and not issue.pull_request and not issue.locked,
    'This issue is closed, locked, or is a pull request.')
  return issue
end
local function count(number)
  return tonumber(db.select('count(*) AS total FROM feedback_votes WHERE issue_number = ?', number)[1].total)
end
local function track(number)
  db.query('INSERT INTO feedback_issues (issue_number) VALUES (?) ON CONFLICT DO NOTHING', number)
end
local function add_vote(number, user)
  track(number)
  db.query([[INSERT INTO feedback_votes (issue_number, user_id, username) VALUES (?, ?, ?)
    ON CONFLICT DO NOTHING]], number, user.id, user.username)
end
-- Limit search grammar to words; user text cannot escape the repository/open
-- issue constraints. Repeat the scope for each OR branch of GitHub search.
local function search(query)
  local cfg, terms, seen = settings(), {}, {}
  for word in query:lower():gmatch('[%w]+') do
    if #word >= 3 and not seen[word] then
      seen[word] = true
      terms[#terms + 1] = 'repo:' .. cfg.repo .. ' is:issue is:open ' .. word
      if #terms == 5 then break end
    end
  end
  assert_error(#terms > 0, 'Search needs a word with at least three letters or digits.')
  return github('GET', '/search/issues?per_page=20&q=' .. util.escape(table.concat(terms, ' OR ')))
end
local function decorated(issue, user_id)
  local number = issue.number
  local votes = count(number)
  local voted = user_id and db.select('1 FROM feedback_votes WHERE issue_number = ? AND user_id = ?', number, user_id)[1] ~= nil
  return {number = number, title = issue.title,
    url = 'https://github.com/' .. settings().repo .. '/issues/' .. number,
    votes = votes, voted = voted or false}
end
function M.list(ctx)
  local cfg = settings()
  local query = text(ctx.params.q or '', 0, 200, 'Search')
  local result
  if query == '' then
    result = github('GET', '/repos/' .. cfg.repo .. '/issues?state=open&per_page=30&sort=updated')
  else
    local found = search(query)
    assert_error(not found.incomplete_results, 'GitHub search is incomplete. Please search again.')
    result = found.items
  end
  local issues = {}
  for _, issue in ipairs(result) do
    if not issue.pull_request then issues[#issues + 1] = decorated(issue, ctx.current_user and ctx.current_user.id) end
  end
  return {success = true, issues = issues, threshold = cfg.threshold}
end
function M.vote(ctx)
  settings()
  local user_id = account(ctx)
  local number = number_param(ctx.params.issue)
  local issue = ensure_open(number)
  add_vote(number, ctx.current_user)
  local synced = M.sync(number)
  return {success = true, issue = decorated(issue, user_id), sync_pending = not synced}
end
function M.create(ctx)
  settings()
  local user_id = account(ctx)
  local title = text(ctx.params.title, 8, 160, 'Title')
  local description = text(ctx.params.description, 20, 5000, 'Description')
  local request_key = text(ctx.params.request_key, 16, 64, 'Request key')
  assert_error(request_key:match('^[%w-]+$'), 'Invalid request key.')
  assert_error(ctx.params.reviewed == '1', 'Search and review similar issues first.')
  local existing = db.select(' * FROM feedback_submissions WHERE user_id = ? AND request_key = ?', user_id, request_key)[1]
  if existing then
    if existing.issue_number and existing.issue_number ~= db.NULL then
      local issue = github('GET', issue_path(existing.issue_number))
      add_vote(existing.issue_number, ctx.current_user)
      local synced = M.sync(existing.issue_number)
      return {success = true, issue = decorated(issue, user_id), sync_pending = not synced}
    end
    -- An ambiguous GitHub timeout must never cause duplicate submissions.
    assert_error(false, 'Submission pending or uncertain. Check GitHub for your ticket before submitting again.')
  end
  -- Repeat the similarity search on the server; the browser cannot skip it.
  local similar = search(title)
  assert_error(not similar.incomplete_results, 'GitHub search is incomplete. Please search again.')
  if #similar.items > 0 and ctx.params.confirm_new ~= '1' then
    return {success = false, review_required = true}
  end
  -- Five unique daily slots bound submission spam even under concurrent requests.
  local claimed = db.query([[INSERT INTO feedback_submissions
      (user_id, request_key, title, description, daily_slot)
      SELECT ?, ?, ?, ?, slot FROM generate_series(1, 5) AS slot
      WHERE NOT EXISTS (SELECT 1 FROM feedback_submissions
        WHERE user_id = ? AND day = current_date AND daily_slot = slot)
      ORDER BY slot LIMIT 1 ON CONFLICT DO NOTHING RETURNING id]],
      user_id, request_key, title, description, user_id)
  assert_error(claimed[1], 'Submission already pending or daily limit reached (5). Please check your tickets.')
  local marker = '<!-- website-feedback:' .. claimed[1].id .. ' -->'
  -- Suppress user-supplied GitHub mentions to prevent notification abuse.
  local safe_title = title:gsub('@', '@\226\128\139')
  local safe_description = description:gsub('@', '@\226\128\139')
  local issue = github('POST', '/repos/' .. settings().repo .. '/issues', {
    title = safe_title, body = safe_description .. '\n\nSubmitted through the website feedback tool.\n' .. marker
  })
  db.query('UPDATE feedback_submissions SET issue_number = ? WHERE id = ?', issue.number, claimed[1].id)
  add_vote(issue.number, ctx.current_user)
  local synced = M.sync(issue.number)
  return {success = true, issue = decorated(issue, user_id), sync_pending = not synced}
end
local actor
local function published_votes(number)
  if not actor then actor = github('GET', '/user').login end
  local published = {}
  for page = 1, 10 do
    local comments = github('GET', issue_path(number) .. '/comments?per_page=100&page=' .. page)
    for _, comment in ipairs(comments) do
      if comment.user.login == actor then
        local id = comment.body:match('^.- voted for this from the site\n\n<!%-%- website%-feedback%-vote:(%d+) %-%->$')
        if id then published[id] = comment.id end
      end
    end
    if #comments < 100 then return published end
  end
  error('Too many comments to reconcile safely')
end
local function pending(number)
  return db.select('1 FROM feedback_votes WHERE issue_number = ? AND comment_id IS NULL LIMIT 1', number)[1] ~= nil
end
local function vote_body(vote)
  -- Escape user-controlled Markdown, newlines and mentions. The username comes
  -- from the authenticated account, never request parameters, and is snapshotted.
  local username = vote.username:gsub('[%c]', ' ')
  username = username:gsub('([\\`*_{}%[%]()#+%.!<>|~%-])', '\\%1'):gsub('@', '@\226\128\139')
  return username .. ' voted for this from the site\n\n<!-- website-feedback-vote:' .. vote.id .. ' -->'
end
function M.sync(number)
  if not pending(number) then return true end
  -- One writer per issue; votes and delivery IDs persist across worker restarts.
  local lease = db.query([[UPDATE feedback_issues SET sync_lease = now() + interval '10 minutes'
    WHERE issue_number = ? AND sync_lease <= now() AND sync_after <= now() RETURNING *]], number)[1]
  if not lease then return false end
  local ok = pcall(function()
    local published = published_votes(number)
    local votes = db.select([[* FROM feedback_votes WHERE issue_number = ? AND comment_id IS NULL
      ORDER BY id LIMIT 25]], number)
    for _, vote in ipairs(votes) do
      -- Discover an accepted comment after a timeout or a crash before DB update.
      local id = published[tostring(vote.id)]
      if not id then id = github('POST', issue_path(number) .. '/comments', {body = vote_body(vote)}).id end
      db.query('UPDATE feedback_votes SET comment_id = ? WHERE id = ?', id, vote.id)
    end
  end)
  db.query([[UPDATE feedback_issues SET sync_lease = now(), sync_after = now() + interval '1 minute'
    WHERE issue_number = ?]], number)
  if not ok and ngx then ngx.log(ngx.ERR, 'Feedback GitHub synchronization pending') end
  return ok and not pending(number)
end
function M.reconcile()
  settings()
  local rows = db.select([[f.issue_number FROM feedback_issues f
    WHERE f.sync_lease <= now() AND f.sync_after <= now()
      AND EXISTS (SELECT 1 FROM feedback_votes v WHERE v.issue_number = f.issue_number AND v.comment_id IS NULL)
    ORDER BY f.sync_after LIMIT 10]])
  for _, row in ipairs(rows) do M.sync(row.issue_number) end
end
return M
