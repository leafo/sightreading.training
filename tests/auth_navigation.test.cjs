const {test, before} = require("node:test")
const assert = require("node:assert/strict")
const vm = require("node:vm")
const {mkdtempSync, writeFileSync, rmSync} = require("node:fs")
const {tmpdir} = require("node:os")
const {join} = require("node:path")
const esbuild = require("esbuild")
let source
before(async () => {
  const temp = mkdtempSync(join(tmpdir(), "auth-navigation-"))
  try {
    const session = join(temp, "session.js")
    writeFileSync(session, "export function getSession() { return globalThis.authTestSession || {} }")
    const result = await esbuild.build({
      stdin: {contents: `
        import * as React from "react"
        import {StaticRouter} from "react-router-dom/server"
        import {renderToStaticMarkup} from "react-dom/server"
        import {AuthLink} from "st/components/auth_navigation"
        import LoginPage, {LoginPage as LoginForm} from "st/components/pages/login_page"
        import RegisterPage, {RegisterPage as RegisterForm} from "st/components/pages/register_page"
        import Header from "st/components/header"
        export function render(path, kind, signedIn = false) {
          globalThis.authTestSession = signedIn ? {currentUser: {id: 1, username: "sean"}} : {}
          const content = kind === "login" ? <LoginPage /> : kind === "register" ? <RegisterPage /> :
            kind === "header" ? <Header /> : <><AuthLink to="/login">Log in</AuthLink><AuthLink to="/register">Register</AuthLink></>
          return renderToStaticMarkup(<StaticRouter location={path}>{content}</StaticRouter>)
        }
        export function submit(kind, returnTo, result) {
          const page = new (kind === "login" ? LoginForm : RegisterForm)()
          page.props = {returnTo}
          page.setState = update => {page.state = {...page.state, ...update}}
          page.afterSubmit(result)
          return page.state
        }
      `, resolveDir: process.cwd(), loader: "jsx"},
      bundle: true, write: false, format: "cjs", platform: "node", loader: {".css": "empty", ".module.css": "empty"},
      nodePaths: ["static/js"], alias: {"st/app": session},
    })
    source = result.outputFiles[0].text
  } finally { rmSync(temp, {recursive: true, force: true}) }
})
function fixture() {
  const navigations = []
  const module = {exports: {}}
  vm.runInNewContext(source, {module, exports: module.exports, require, process, Buffer,
    TextEncoder, TextDecoder, URL, URLSearchParams, setTimeout, clearTimeout, setImmediate,
    window: {FormData, XMLHttpRequest: class {}, location: {assign: path => navigations.push(path)}}})
  return {...module.exports, navigations}
}
test("login links carry the complete current route", () => {
  const app = fixture()
  const html = app.render("/feedback?filter=scroll#issues", "links")
  assert.match(html, /href="\/login\?return_to=%2Ffeedback%3Ffilter%3Dscroll%23issues"/)
  assert.match(html, /href="\/register\?return_to=%2Ffeedback%3Ffilter%3Dscroll%23issues"/)
})
test("actual login and registration forms preserve the destination when switching", () => {
  const app = fixture()
  const target = encodeURIComponent("/feedback?filter=scroll#issues")
  assert.match(app.render(`/login?return_to=${target}`, "login"), new RegExp(`href="/register\\?return_to=${target}"`))
  assert.match(app.render(`/register?return_to=${target}`, "register"), new RegExp(`href="/login\\?return_to=${target}"`))
})
test("both form submit handlers navigate to the supplied safe return page", () => {
  const app = fixture()
  for (const kind of ["login", "register"]) {
    app.submit(kind, "/feedback?filter=scroll#issues", {currentUser: {id: 1}})
    assert.equal(app.navigations.at(-1), "/feedback?filter=scroll#issues")
  }
  const before = app.navigations.length
  assert.deepEqual(app.submit("login", "/feedback", {errors: ["Incorrect password"]}).errorMessage, "Incorrect password")
  assert.equal(app.navigations.length, before)
  app.submit("login", "//evil.example", {currentUser: {id: 1}})
  assert.equal(app.navigations.at(-1), "/")
})
test("sidebar login also preserves the current tool, query and fragment", () => {
  const app = fixture()
  const html = app.render("/chord-lab?root=C#voicings", "header")
  assert.match(html, /href="\/login\?return_to=%2Fchord-lab%3Froot%3DC%23voicings"/)
  assert.match(html, /href="\/register\?return_to=%2Fchord-lab%3Froot%3DC%23voicings"/)
})

test("sidebar footer uses labeled tooltip icons without visible Feedback/Stats text", () => {
  const app = fixture()
  for (const signedIn of [false, true]) {
    const html = app.render("/feedback", "header", signedIn)
    for (const label of signedIn ? ["Guide", "Feedback", "Stats"] : ["Guide", "Feedback"]) {
      const anchor = html.match(new RegExp(`<a[^>]*aria-label="${label}"[^>]*>([\\s\\S]*?)</a>`))
      assert.ok(anchor, label)
      assert.match(anchor[0], new RegExp(`title="${label}"`))
      assert.match(anchor[1], /<svg[^>]*aria-hidden="true"/)
      assert.equal(anchor[1].replace(/<[^>]*>/g, "").trim(), "")
    }
    assert.doesNotMatch(html, />Feedback<|>Stats</)
  }
})
