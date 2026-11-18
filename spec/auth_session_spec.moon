import use_test_server from require "lapis.spec"
import request from require "lapis.spec.server"
import to_json from require "lapis.util"
factory = require "spec.factory"

describe "browser authentication sessions", ->
  use_test_server!
  import Users from require "spec.models"

  browser = ->
    cookie = nil
    (path, post) ->
      opts = { expect: "json", headers: {} }
      opts.headers.Cookie = cookie if cookie
      opts.post = post if post
      status, body, headers = request path, opts
      set_cookie = headers.set_cookie
      if set_cookie
        set_cookie = set_cookie[1] if type(set_cookie) == "table"
        cookie = set_cookie\match "^[^;]+"
      assert.same 200, status
      assert.same "no-store", headers.cache_control
      body

  it "refreshes a stale token and switches accounts without changing either account's preferences", ->
    first = factory.Users password: "first-password"
    second = factory.Users password: "second-password"
    first\update trainer_preferences: to_json { version: 1, staff: "treble" }
    second\update trainer_preferences: to_json { version: 1, staff: "bass" }
    visit = browser!
    token = visit("/csrf-token.json").csrfToken
    assert.same "string", type token
    assert.same { "invalid csrf" }, visit("/login.json", {
      username: first.username, password: "first-password", csrf_token: "stale-page-token"
    }).errors
    token = visit("/csrf-token.json").csrfToken
    logged_in = visit "/login.json", { username: first.username, password: "first-password", csrf_token: token }
    assert.same first.id, logged_in.currentUser.id
    assert.same "treble", logged_in.currentUser.trainerPreferences.staff
    assert.true visit("/logout.json", { csrf_token: token }).success
    token = visit("/csrf-token.json").csrfToken
    logged_in = visit "/login.json", { username: second.username, password: "second-password", csrf_token: token }
    assert.same second.id, logged_in.currentUser.id
    assert.same "bass", logged_in.currentUser.trainerPreferences.staff
    first\refresh!
    second\refresh!
    assert.same "treble", first.trainer_preferences.staff
    assert.same "bass", second.trainer_preferences.staff

  it "keeps the account authenticated when logout is rejected", ->
    user = factory.Users password: "test-password"
    visit = browser!
    token = visit("/csrf-token.json").csrfToken
    assert.same user.id, visit("/login.json", {
      username: user.username, password: "test-password", csrf_token: token
    }).currentUser.id
    assert.same { "invalid csrf" }, visit("/logout.json", { csrf_token: "wrong" }).errors
    assert.true visit("/stats.json").success

  it "does not cache session-bound HTML", ->
    status, _, headers = request "/"
    assert.same 200, status
    assert.same "no-store", headers.cache_control
