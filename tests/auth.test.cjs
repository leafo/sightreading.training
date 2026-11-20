const {test, before} = require("node:test")
const assert = require("node:assert/strict")
const vm = require("node:vm")
const esbuild = require("esbuild")

let source
before(async () => {
  const result = await esbuild.build({entryPoints: ["static/js/st/auth.js"], bundle: true, write: false, format: "cjs"})
  source = result.outputFiles[0].text
})

function browser(fetch) {
  const state = {token: "stale-page-token", navigations: []}
  const module = {exports: {}}
  vm.runInNewContext(source, {
    module, exports: module.exports, FormData, fetch, URL, URLSearchParams,
    document: {getElementById: () => ({setAttribute: (key, value) => {state.token = value}})},
    window: {location: {assign: path => state.navigations.push(path)}},
  })
  return {...module.exports, state}
}

test("replaces a stale page token with the current cookie's token before sending credentials", async () => {
  const calls = []
  const auth = browser(async (url, options) => {
    calls.push({url, options})
    if (url === "/csrf-token.json") return {ok: true, json: async () => ({csrfToken: "current-cookie-token"})}
    assert.equal(options.body.get("csrf_token"), "current-cookie-token")
    assert.equal(options.body.getAll("csrf_token").length, 1)
    assert.equal(options.body.get("username"), "second-user")
    assert.equal(options.body.get("password"), "test-password")
    return {ok: true, json: async () => ({currentUser: {id: 2}})}
  })
  const fields = new FormData()
  fields.set("username", "second-user")
  fields.set("password", "test-password")
  fields.set("csrf_token", "stale-page-token")
  const result = await auth.postAuth("/login.json", fields)
  assert.equal(result.currentUser.id, 2)
  assert.deepEqual(calls.map(call => call.url), ["/csrf-token.json", "/login.json"])
  for (const {options} of calls) {
    assert.equal(options.credentials, "same-origin")
    assert.equal(options.cache, "no-store")
  }
  assert.equal(auth.state.token, "current-cookie-token")
})

test("failed or malformed token refresh never submits an auth mutation", async () => {
  for (const reply of [{ok: false}, {ok: true, json: async () => ({})}]) {
    let calls = 0
    const auth = browser(async () => {calls++; return reply})
    await assert.rejects(auth.postAuth("/register.json", new FormData()), /refresh your session/)
    assert.equal(calls, 1)
    assert.deepEqual(auth.state.navigations, [])
  }
})

test("a CSRF rejection does not log the UI out, reload, or blindly retry a POST", async () => {
  let posts = 0
  const auth = browser(async url => {
    if (url === "/csrf-token.json") return {ok: true, json: async () => ({csrfToken: "token"})}
    posts++
    return {ok: true, json: async () => ({errors: ["invalid csrf"]})}
  })
  const result = await auth.postAuth("/logout.json")
  assert.equal(auth.completeAuth(result), false)
  assert.equal(posts, 1)
  assert.deepEqual(auth.state.navigations, [])
})

test("successful login, registration and logout load a fresh document instead of reusing account state", () => {
  const auth = browser(() => {throw new Error("unexpected network")})
  for (const result of [{currentUser: {id: 1}}, {success: true}, {currentUser: {id: 2}}]) {
    assert.equal(auth.completeAuth(result), true)
  }
  assert.deepEqual(auth.state.navigations, ["/", "/", "/"])
  for (const result of [null, {}, {errors: ["Incorrect username or password"]}]) {
    assert.equal(auth.completeAuth(result), false)
  }
  assert.equal(auth.state.navigations.length, 3)
})

test("HTTP errors and unapproved destinations cannot be reported as successful authentication", async () => {
  const auth = browser(async url => url === "/csrf-token.json"
    ? {ok: true, json: async () => ({csrfToken: "token"})}
    : {ok: false})
  await assert.rejects(auth.postAuth("/login.json", new FormData()), /Authentication failed/)
  await assert.rejects(auth.postAuth("https://other.example/login", new FormData()), /Unknown authentication action/)
  assert.deepEqual(auth.state.navigations, [])
})


test("returns to the full initiating page after login, including query and fragment", () => {
  const auth = browser(() => {throw new Error("unexpected network")})
  for (const path of ["/feedback", "/scales?instrument=piano#keyboard", "/song/123/test-song?transpose=2#practice"]) {
    const page = new URL(path, "https://music-tools.example")
    const login = new URL(auth.authUrl("/login", page), page)
    assert.equal(login.searchParams.get("return_to"), path)
    const destination = auth.authReturnTo(login)
    assert.equal(auth.completeAuth({currentUser: {id: 1}}, {assign: p => auth.state.navigations.push(p)}, destination), true)
    assert.equal(auth.state.navigations.at(-1), path)
  }
})

test("switching forms, refreshing, and separate tabs retain their own return destinations", () => {
  const auth = browser(() => {throw new Error("unexpected network")})
  for (const origin of ["/feedback?search=scroll#issues", "/chord-lab?root=C"]) {
    const login = new URL(auth.authUrl("/login", new URL(origin, "https://music-tools.example")), "https://music-tools.example")
    const register = new URL(auth.authUrl("/register", login), login)
    const backToLogin = new URL(auth.authUrl("/login", register), register)
    // A fresh helper instance represents a reload/new document, with no storage.
    const fresh = browser(() => {throw new Error("unexpected network")})
    assert.equal(fresh.authReturnTo(register), origin)
    assert.equal(fresh.authReturnTo(backToLogin), origin)
    assert.equal(fresh.completeAuth({currentUser: {id: 2}}, {assign: p => fresh.state.navigations.push(p)}, fresh.authReturnTo(register)), true)
    assert.deepEqual(fresh.state.navigations, [origin])
  }
})

test("blocks external redirects, malformed targets, control characters and auth-page loops", () => {
  const auth = browser(() => {throw new Error("unexpected network")})
  for (const target of [undefined, null, "", "https://evil.example", "//evil.example", "javascript:alert(1)",
    "/\\evil.example", "/%5cevil.example", "/%2f%2fevil.example", "/feedback\n", "/%0afeedback", "/%", "/login", "/register/", "/LOGIN?return_to=/feedback",
    "/x/../login", "/%6cogin", "/register?return_to=//evil.example"]) {
    assert.equal(auth.safeReturnTo(target), "/", String(target))
    auth.completeAuth({currentUser: {id: 1}}, {assign: p => auth.state.navigations.push(p)}, target)
    assert.equal(auth.state.navigations.at(-1), "/")
  }
  assert.throws(() => auth.authUrl("https://evil.example/login", {pathname: "/feedback"}), /Unknown authentication page/)
  assert.equal(auth.authReturnTo({pathname: "/login", search: "?return_to=https%3A%2F%2Fevil.example"}), "/")
})

test("login/register without an origin fall back home; rejected login stays on its form", () => {
  const auth = browser(() => {throw new Error("unexpected network")})
  for (const pathname of ["/login", "/register"]) assert.equal(auth.authReturnTo({pathname}), "/")
  assert.equal(auth.completeAuth({errors: ["Incorrect password"]}, {assign: p => auth.state.navigations.push(p)}, "/feedback"), false)
  assert.deepEqual(auth.state.navigations, [])
  // A stale query on another page cannot affect logout's existing home redirect.
  auth.completeAuth({success: true}, {pathname: "/feedback", search: "?return_to=/account", assign: p => auth.state.navigations.push(p)})
  assert.deepEqual(auth.state.navigations, ["/"])
})
