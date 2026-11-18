-- Real disposable PostgreSQL; fake remote HTTP. Loaded by feedback_spec.moon.
return function()
  local busted = require('busted')
  local before_each, after_each, it = busted.before_each, busted.after_each, busted.it
  local assert = require('luassert')
  local stub = require('luassert.stub')
  local db = require('lapis.db')
  local util = require('lapis.util')
  local original_http = package.loaded['resty.http']
  local http = {}
  local factory = require('spec.factory')
  local feedback, issues, comments, calls, offline, pending_create, pending_comment, values
  local function fake_request(_, url, opts)
    calls[#calls + 1] = {url = url, opts = opts}
    assert.is_true(opts.ssl_verify)
    assert.equal('Bearer test-token', opts.headers.Authorization)
    if offline then return nil, 'private network failure' end
    local body = opts.body and util.from_json(opts.body)
    local result
    if url:find('/search/issues?', 1, true) then
      result = {items = {}, incomplete_results = false}
    elseif url:match('/user$') then
      result = {login = 'test-bot'}
    elseif url:match('/issues/comments/%d+$') then
      local id = tonumber(url:match('(%d+)$'))
      comments[id].body = body.body
      result = comments[id]
    elseif url:find('/comments?', 1, true) then
      result = {}
      local number = tonumber(url:match('/issues/(%d+)/'))
      for _, comment in ipairs(comments) do
        if comment.issue_number == number then result[#result + 1] = comment end
      end
    elseif url:match('/comments$') then
      result = {id = #comments + 1, body = body.body, user = {login = 'test-bot'},
        issue_number = tonumber(url:match('/issues/(%d+)/'))}
      comments[#comments + 1] = result
      if pending_comment then return nil, 'ambiguous comment timeout' end
    elseif url:match('/issues$') and opts.method == 'POST' then
      local number = #issues + 1
      result = {number = number, title = body.title, body = body.body, state = 'open'}
      issues[number] = result
      if pending_create then return nil, 'ambiguous timeout' end
    elseif url:match('/issues/%d+$') then
      result = issues[tonumber(url:match('(%d+)$'))]
    else
      result = issues
    end
    return {status = 200, body = util.to_json(result)}
  end
  local function ctx(user, params) return {current_user = user, params = params or {}} end
  local function draft(key)
    return {title = 'Improve scrolling speed', description = 'Please make scrolling easier to control.',
      request_key = key or '12345678-1234-1234-1234-123456789abc', reviewed = '1', confirm_new = '1'}
  end
  before_each(function()
    -- Isolate accounts as well as votes from auth specs and factory reloads.
    db.query('TRUNCATE feedback_votes, feedback_submissions, feedback_issues, users RESTART IDENTITY CASCADE')
    package.loaded['helpers.feedback'] = nil
    feedback = require('helpers.feedback')
    issues = {{number = 1, title = 'Scroll speed', state = 'open'}}
    comments, calls, offline, pending_create, pending_comment = {}, {}, false, false, false
    values = {SR_FEEDBACK_ENABLED = '1', SR_FEEDBACK_TOKEN = 'test-token'}
    stub(os, 'getenv', function(name) return values[name] end)
    http.new = function() return {set_timeouts = function() end, request_uri = fake_request} end
    package.loaded['resty.http'] = http
  end)
  after_each(function()
    package.loaded['resty.http'] = original_http
    os.getenv:revert()
    db.query('TRUNCATE feedback_votes, feedback_submissions, feedback_issues, users RESTART IDENTITY CASCADE')
    package.loaded['helpers.feedback'] = nil
  end)
  it('allows anonymous search and bounds repository search grammar', function()
    local result = feedback.list(ctx(nil, {q = 'repo:evil/other is:closed scroll'}))
    assert.is_true(result.success)
    assert.equal(0, #result.issues)
    assert.equal(5, result.threshold)
    local url = calls[1].url
    assert.is_truthy(url:find('Naphier', 1, true))
    assert.is_nil(url:find('repo:evil/other', 1, true))
  end)
  it('requires accounts for mutations and rejects non-issue targets', function()
    assert.is_false(pcall(feedback.vote, ctx(nil, {issue = '1'})))
    local user = factory.Users()
    for _, number in ipairs({'0', '-1', '1/../../2', '9999999999'}) do
      assert.is_false(pcall(feedback.vote, ctx(user, {issue = number})))
    end
    issues[1].state = 'closed'
    assert.is_false(pcall(feedback.vote, ctx(user, {issue = '1'})))
    issues[1].state = 'open'
    issues[1].pull_request = {}
    assert.is_false(pcall(feedback.vote, ctx(user, {issue = '1'})))
    assert.equal(0, tonumber(db.select('count(*) AS n FROM feedback_votes')[1].n))
  end)
  it('posts one attributed comment per website account and ignores client-supplied usernames', function()
    local first = factory.Users({username = 'sean'})
    feedback.vote(ctx(first, {issue = '1', username = 'forged-user'}))
    feedback.vote(ctx(first, {issue = '1'}))
    for i = 2, 5 do feedback.vote(ctx(factory.Users(), {issue = '1'})) end
    db.query("UPDATE feedback_issues SET sync_after = now() - interval '1 second'")
    feedback.reconcile()
    assert.equal(5, tonumber(db.select('count(*) AS n FROM feedback_votes')[1].n))
    assert.equal(5, #comments)
    assert.is_truthy(comments[1].body:find('sean voted for this from the site', 1, true))
    assert.is_nil(comments[1].body:find('forged-user', 1, true))
    local ids = {}
    for _, comment in ipairs(comments) do
      local id = comment.body:match('<!%-%- website%-feedback%-vote:(%d+) %-%->')
      assert.is_truthy(id)
      assert.is_nil(ids[id])
      ids[id] = true
    end
    assert.equal(0, tonumber(db.select('count(*) AS n FROM feedback_votes WHERE comment_id IS NULL')[1].n))
    feedback.reconcile()
    assert.equal(5, #comments)
  end)
  it('keeps queued votes through a GitHub outage and retries them', function()
    feedback.vote(ctx(factory.Users(), {issue = '1'}))
    local result = feedback.vote(ctx(factory.Users(), {issue = '1'}))
    assert.is_true(result.sync_pending)
    db.query("UPDATE feedback_issues SET sync_after = now() - interval '1 second'")
    offline = true
    assert.is_false(feedback.sync(1))
    assert.equal(2, tonumber(db.select('count(*) AS n FROM feedback_votes')[1].n))
    offline = false
    db.query("UPDATE feedback_issues SET sync_after = now() - interval '1 second'")
    feedback.reconcile()
    assert.equal(2, #comments)
    assert.equal(0, tonumber(db.select('count(*) AS n FROM feedback_votes WHERE comment_id IS NULL')[1].n))
  end)
  it('recovers an accepted comment after an ambiguous timeout without a duplicate', function()
    pending_comment = true
    local result = feedback.vote(ctx(factory.Users(), {issue = '1'}))
    assert.is_true(result.success)
    assert.is_true(result.sync_pending)
    assert.equal(1, #comments)
    pending_comment = false
    db.query("UPDATE feedback_issues SET sync_after = now() - interval '1 second'")
    feedback.reconcile()
    assert.equal(1, #comments)
    assert.equal(comments[1].id, tonumber(db.select('comment_id FROM feedback_votes')[1].comment_id))
  end)
  it('does not adopt a forged vote comment from a different GitHub account', function()
    pending_comment = true
    feedback.vote(ctx(factory.Users(), {issue = '1'}))
    pending_comment = false
    comments[1].user.login = 'attacker'
    db.query("UPDATE feedback_issues SET sync_after = now() - interval '1 second'")
    feedback.reconcile()
    assert.equal(2, #comments)
    assert.equal('test-bot', comments[2].user.login)
  end)
  it('escapes username Markdown and mentions while preserving vote attribution', function()
    local user = factory.Users()
    db.query('UPDATE users SET username = ? WHERE id = ?', '@someone*[x]', user.id)
    user:refresh()
    feedback.vote(ctx(user, {issue = '1'}))
    assert.is_truthy(comments[1].body:find(' voted for this from the site\n\n<!-- website-feedback-vote:', 1, true))
    assert.is_nil(comments[1].body:find('@someone', 1, true))
    assert.is_truthy(comments[1].body:find('\\*\\[x\\]', 1, true))
  end)
  it('resumes pending deliveries after an expired worker lease', function()
    feedback.vote(ctx(factory.Users(), {issue = '1'}))
    feedback.vote(ctx(factory.Users(), {issue = '1'}))
    db.query("UPDATE feedback_issues SET sync_after = now() - interval '1 second', sync_lease = now() + interval '1 hour'")
    feedback.reconcile()
    assert.equal(1, #comments)
    db.query("UPDATE feedback_issues SET sync_lease = now() - interval '1 second'")
    feedback.reconcile()
    assert.equal(2, #comments)
  end)
  it('creates one issue and first vote for repeated submission UUIDs', function()
    local user = factory.Users()
    local result = feedback.create(ctx(user, draft()))
    assert.equal(2, result.issue.number)
    assert.equal(1, result.issue.votes)
    result = feedback.create(ctx(user, draft()))
    assert.equal(2, #issues)
    assert.equal(1, result.issue.votes)
    assert.equal(1, tonumber(db.select('count(*) AS n FROM feedback_submissions')[1].n))
  end)
  it('does not duplicate issues after ambiguous GitHub create timeouts', function()
    local user = factory.Users()
    pending_create = true
    assert.is_false(pcall(feedback.create, ctx(user, draft())))
    pending_create = false
    assert.is_false(pcall(feedback.create, ctx(user, draft())))
    assert.equal(2, #issues)
  end)
  it('limits daily submissions and refuses missing review', function()
    local user = factory.Users()
    local invalid = draft()
    invalid.reviewed = '0'
    assert.is_false(pcall(feedback.create, ctx(user, invalid)))
    for i = 1, 5 do feedback.create(ctx(user, draft('daily-request-key-' .. i))) end
    assert.is_false(pcall(feedback.create, ctx(user, draft('daily-request-key-6'))))
    assert.equal(6, #issues)
  end)
  it('honors the disabled switch without contacting GitHub', function()
    values.SR_FEEDBACK_ENABLED = nil
    assert.is_false(pcall(feedback.list, ctx(nil)))
    assert.equal(0, #calls)
  end)
end
