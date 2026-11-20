// Render and exercise the real bundle using synthetic local HTTP responses.
// Never contacts a deployment host, GitHub, or an external account.
const assert = require('node:assert/strict')
const http = require('node:http')
const fs = require('node:fs')
const path = require('node:path')
const esbuild = require('esbuild')
const {chromium} = require('playwright')
const root = path.resolve(__dirname, '..')
const out = path.join(root, 'dev/out/navigation-review')
const user = {id: 1, username: 'sean', displayName: 'Sean'}
const errors = []

async function main() {
  fs.mkdirSync(out, {recursive: true})
  const {buildAssets} = await import('./build_assets.mjs')
  buildAssets()
  await esbuild.build({absWorkingDir: root, entryPoints: ['static/js/st/main.jsx'], bundle: true,
    outfile: path.join(out, 'app.js'), nodePaths: ['static/js'], external: ['/static/fonts/*'],
    define: {ST_FRONTEND_ONLY: 'false'}})
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://localhost')
    const json = (value, headers = {}) => {res.writeHead(200, {'Content-Type': 'application/json', ...headers}); res.end(JSON.stringify(value))}
    if (url.pathname === '/csrf-token.json') return json({csrfToken: 'preview-csrf'})
    if (['/login.json', '/register.json'].includes(url.pathname)) {
      req.resume(); req.on('end', () => json({currentUser: user}, {'Set-Cookie': 'signedIn=1; Path=/; SameSite=Lax'})); return
    }
    if (url.pathname === '/feedback.json') return json({success: true, threshold: 5, issues: [{number: 101,
      title: 'Make scrolling notes easier to follow', votes: 3, voted: false, url: '#issue-101'}]})
    const relative = url.pathname === '/bundle.js' ? 'dev/out/navigation-review/app.js' :
      url.pathname === '/bundle.css' ? 'dev/out/navigation-review/app.css' : url.pathname.startsWith('/static/') ? url.pathname.slice(1) : null
    if (relative) {
      const file = path.resolve(root, relative)
      if (!file.startsWith(root + path.sep) || !fs.existsSync(file)) {res.writeHead(404); res.end(); return}
      const type = {'.js': 'application/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.json': 'application/json', '.woff': 'font/woff', '.woff2': 'font/woff2'}
      res.setHeader('Content-Type', type[path.extname(file)] || 'application/octet-stream')
      fs.createReadStream(file).pipe(res); return
    }
    res.setHeader('Content-Type', 'text/html')
    const session = /signedIn=1/.test(req.headers.cookie || '') ? {currentUser: user} : {}
    res.end(`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><meta id="csrf_token" content="preview-csrf"><link rel="stylesheet" href="/bundle.css"></head><body><div id="page"></div><script>window.ST_initial_session=${JSON.stringify(session)};Object.defineProperty(navigator,'requestMIDIAccess',{value:undefined});</script><script src="/bundle.js"></script></body></html>`)
  })
  let browser
  try {
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
    const base = `http://127.0.0.1:${server.address().port}`
    browser = await chromium.launch({headless: true, ...(process.env.CHROME_BIN ? {executablePath: process.env.CHROME_BIN} : {})})
    for (const [name, viewport, theme, signedIn] of [
      ['desktop-dark', {width: 1280, height: 900}, 'dark', true],
      ['desktop-light', {width: 1280, height: 900}, 'light', false],
      ['mobile-dark', {width: 390, height: 844}, 'dark', true],
      ['mobile-light', {width: 390, height: 844}, 'light', true],
    ]) {
      const context = await browser.newContext({viewport, colorScheme: theme})
      if (signedIn) await context.addCookies([{name: 'signedIn', value: '1', url: base}])
      const page = await context.newPage(); page.on('pageerror', error => errors.push(error.message))
      await page.goto(base + '/feedback')
      await page.getByRole('heading', {name: 'Help shape the site'}).waitFor()
      await page.getByRole('link', {name: '#101 Make scrolling notes easier to follow'}).waitFor()
      const footer = page.locator('aside [class*="footer_controls"]')
      for (const label of signedIn ? ['Guide', 'Feedback', 'Stats'] : ['Guide', 'Feedback']) {
        const link = footer.getByRole('link', {name: label, exact: true})
        assert.equal(await link.getAttribute('title'), label)
        assert.equal((await link.textContent()).trim(), '')
        const box = await link.boundingBox(), parent = await footer.boundingBox()
        assert.ok(box.width >= 40 && box.height >= 44, label + ' target size')
        assert.ok(box.x >= parent.x - 1 && box.x + box.width <= parent.x + parent.width + 1, label + ' stays within footer')
      }
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'no horizontal overflow')
      // Verify visible focus after actual keyboard input rather than just CSS presence.
      await footer.getByRole('link', {name: 'Guide', exact: true}).focus()
      await page.keyboard.press('Tab')
      assert.equal(await page.evaluate(() => document.activeElement.getAttribute('aria-label')), 'Feedback')
      assert.ok(await page.evaluate(() => getComputedStyle(document.activeElement).outlineStyle !== 'none'))
      await page.screenshot({path: path.join(out, name + '.png'), fullPage: false})
      if (viewport.width < 761) {
        await page.getByRole('button', {name: 'Close navigation', exact: true}).first().click()
        await page.getByRole('button', {name: 'Open navigation', exact: true}).waitFor()
        await page.screenshot({path: path.join(out, name + '-content.png'), fullPage: false})
      }
      await context.close()
    }
    const context = await browser.newContext({viewport: {width: 1280, height: 900}})
    const page = await context.newPage(); page.on('pageerror', error => errors.push(error.message))
    const original = base + '/feedback?filter=scroll#issues'
    await page.goto(original)
    await page.getByRole('main').getByRole('link', {name: 'Log in', exact: true}).click()
    assert.equal(new URL(page.url()).searchParams.get('return_to'), '/feedback?filter=scroll#issues')
    await page.locator('form[action="/login.json"]').getByRole('link', {name: 'Register', exact: true}).click()
    await page.reload()
    assert.equal(new URL(page.url()).searchParams.get('return_to'), '/feedback?filter=scroll#issues')
    await page.getByRole('link', {name: 'Log in to existing account', exact: true}).click()
    await page.getByLabel('Username', {exact: true}).fill('sean')
    await page.getByLabel('Password', {exact: true}).fill('test-only-password')
    await page.getByRole('button', {name: 'Submit', exact: true}).click()
    await page.waitForURL(original)
    await page.getByRole('heading', {name: 'Help shape the site'}).waitFor()
    assert.equal(await page.getByRole('link', {name: 'Sean', exact: true}).count(), 1)
    await context.clearCookies()
    await page.goto(base + '/account')
    await page.waitForURL(/\/login\?return_to=%2Faccount$/)
    await page.goto(base + '/stats')
    await page.waitForURL(/\/login\?return_to=%2Fstats$/)
    await context.close()
    assert.deepEqual(errors, [])
    console.log('Browser review passed: desktop/mobile, light/dark, signed-in/out, footer target sizes, keyboard focus, overflow, and login return flow.')
  } finally {
    if (browser) await browser.close()
    await new Promise(resolve => server.close(resolve))
  }
}
main().catch(error => {console.error(error); process.exitCode = 1})
