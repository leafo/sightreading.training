// Authentication must use the token belonging to the current cookie, rather
// than a token embedded in a page left open before the session changed.
const actions = new Set(["/login.json", "/register.json", "/logout.json", "/display-name.json"])

export async function postAuth(action, data = new FormData()) {
  if (!actions.has(action)) throw new Error("Unknown authentication action")
  const tokenResponse = await fetch("/csrf-token.json", {
    credentials: "same-origin", cache: "no-store",
  })
  if (!tokenResponse.ok) throw new Error("Could not refresh your session. Please try again.")
  const session = await tokenResponse.json()
  if (typeof session.csrfToken !== "string" || !session.csrfToken) {
    throw new Error("Could not refresh your session. Please try again.")
  }
  const meta = document.getElementById("csrf_token")
  if (meta) meta.setAttribute("content", session.csrfToken)
  data.set("csrf_token", session.csrfToken)
  const response = await fetch(action, {
    method: "POST", credentials: "same-origin", cache: "no-store", body: data,
  })
  if (!response.ok) throw new Error("Authentication failed. Please try again.")
  return response.json()
}

function unsafeReturnCharacters(value) {
  return Array.from(value).some(character => character === "\\" || character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127)
}

// Only root-relative, non-authentication destinations may survive authentication.
// URL normalization also catches dot-segment and encoded auth-page loops.
export function safeReturnTo(value) {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//") || (value.includes(" ") || unsafeReturnCharacters(value))) return "/"
  try {
    const url = new URL(value, "https://music-tools.invalid")
    const pathname = decodeURIComponent(url.pathname)
    if (url.origin !== "https://music-tools.invalid" || pathname.startsWith("//") ||
        unsafeReturnCharacters(pathname) || /^\/(login|register)(\/|$)/i.test(pathname)) return "/"
    return url.pathname + url.search + url.hash
  } catch {
    return "/"
  }
}

export function authReturnTo(location) {
  if (/^\/(login|register)\/?$/i.test(location.pathname || "")) {
    return safeReturnTo(new URLSearchParams(location.search || "").get("return_to"))
  }
  return safeReturnTo((location.pathname || "/") + (location.search || "") + (location.hash || ""))
}

export function authUrl(action, location) {
  if (action !== "/login" && action !== "/register") throw new Error("Unknown authentication page")
  return `${action}?return_to=${encodeURIComponent(authReturnTo(location))}`
}

export function completeAuth(result, location = window.location, returnTo = "/") {
  if (!result || result.errors || (!result.currentUser && result.success !== true)) return false
  // Keep a fresh document so account data, CSRF tokens and MIDI handlers reset.
  // Logout retains its default home destination; login/register supply their origin.
  location.assign(safeReturnTo(returnTo))
  return true
}
