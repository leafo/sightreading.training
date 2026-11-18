/*global ga, ST_FRONTEND_ONLY*/

export const ENABLE_PRESETS = false
export const ENABLE_SERVICE_WORKER = false

// true when built by the frontend-only dev server (dev/serve.mjs), which has
// no backend to serve API requests
export const FRONTEND_ONLY = typeof ST_FRONTEND_ONLY !== "undefined" && ST_FRONTEND_ONLY

export function setTitle(title) {
  if (title) {
    document.title = `${title} | Napland Music Tools`
  } else {
    document.title = "Napland Music Tools"
  }
}

export function csrfToken() {
  return document.getElementById("csrf_token").getAttribute("content")
}

export function gaEvent(category, action, label, value, interactive=true) {
  let opts = {
    hitType: "event",
    eventCategory: category,
    eventAction: action,
    eventLabel: label,
    eventValue: value,
  }

  if (!interactive) {
    opts.nonInteraction = 1
  }

  try {
    if (window.ga) {
      ga("send", opts)
    } else {
      // console.log("ga:", opts)
    }
  } catch (e) {}
}

