// Frontend-only dev server: bundles and serves the app with esbuild, no
// backend required. Backend features (login, stats, play-along song library)
// will 404; everything else works.
//
//   npm run dev

import {join, dirname} from "path"
import {fileURLToPath} from "url"

import * as esbuild from "esbuild"
import {buildAssets} from "./build_assets.mjs"

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..")
process.chdir(ROOT)

const generated = buildAssets()
if (generated.length) {
  console.log(`generated ${generated.length} asset file(s)`)
}

// bundle to dev/out rather than static/ so the tup-managed main.js on a
// full checkout is never overwritten by the frontend-only workflow
const ctx = await esbuild.context({
  entryPoints: ["static/js/st/main.jsx"],
  bundle: true,
  sourcemap: true,
  outfile: "dev/out/main.js",
  nodePaths: ["static/js"],
  external: ["/static/fonts/*"],
  define: {ST_FRONTEND_ONLY: "true"},
  logLevel: "info",
})

await ctx.watch()

const {port} = await ctx.serve({
  servedir: ".",
  fallback: "dev/index.html",
  port: 3000,
})

console.log(`\nNapland Music Tools (frontend only): http://localhost:${port}/`)
