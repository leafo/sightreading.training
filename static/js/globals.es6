/*global ga*/

export function setTitle(title) {
  if (title) {
    document.title = `${title} | Sight Reading Trainer`
  } else {
    document.title = "Sight Reading Trainer"
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
      console.debug("event:", opts)
    }
  } catch (e) {}
}

