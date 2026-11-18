// Authentication must use the token belonging to the current cookie, rather
// than a token embedded in a page left open before the session changed.
const actions = new Set(["/login.json", "/register.json", "/logout.json"])

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

export function completeAuth(result, location = window.location) {
  if (!result || result.errors || (!result.currentUser && result.success !== true)) return false
  // A new document discards the previous account's trainer stores, MIDI
  // handlers, statistics timers and CSRF meta tag together.
  location.assign("/")
  return true
}
