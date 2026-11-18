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

  it "saves and clears only the authenticated account's display name", ->
    user = factory.Users password: "test-password"
    other = factory.Users display_name: "Other musician"
    visit = browser!
    token = visit("/csrf-token.json").csrfToken
    save_name = (name, account_id=tostring(user.id), csrf_token=token) ->
      visit "/display-name.json", {display_name: name, :account_id, :csrf_token}

    assert.same { "You must be logged in" }, save_name("Guest").errors
    assert.same user.id, visit("/login.json", {
      username: user.username, password: "test-password", csrf_token: token
    }).currentUser.id
    token = visit("/csrf-token.json").csrfToken
    assert.same { "invalid csrf" }, save_name("Invalid token", tostring(user.id), "wrong").errors
    assert.same { "Your account changed. Reload the page and try again." }, save_name("Wrong account", tostring(other.id)).errors
    assert.same { "Display name is too long" }, save_name(string.rep("a", 256)).errors
    assert.same { "Display names cannot contain control characters" }, save_name("A\nB").errors

    name = "Band </script> name"
    saved = save_name "  #{name}  "
    assert.same name, saved.currentUser.displayName
    assert.same user.username, saved.currentUser.username
    user\refresh!
    other\refresh!
    assert.same name, user\name_for_display!
    assert.same "Other musician", other\name_for_display!

    assert.same user.username, save_name("   ").currentUser.username
    user\refresh!
    assert.same user.username, user\name_for_display!
