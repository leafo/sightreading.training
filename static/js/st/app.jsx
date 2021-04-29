import App from "st/components/app"
import {ENABLE_SERVICE_WORKER} from "st/globals"

import * as React from "react"
import * as ReactDOM from "react-dom"

let currentSession = null;

export function getSession() {
  return currentSession;
}

export function init(session) {
  currentSession = session || {}

  ReactDOM.render(<App />, document.getElementById("page"));
  installServiceWorker(session.cacheBuster)
}

export function testPage(session) {
  currentSession = session || {}
  ReactDOM.render(<App layout={App.BlankLayout} />, document.getElementById("page"));
}

export function installServiceWorker(timestamp) {
  if (!ENABLE_SERVICE_WORKER) {
    console.warn("Service worker not enabled")
    return
  }

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register(`/sw.js?${timestamp}`).then(function(registration) {
      console.log("Service worker registered", registration.scope)
    }, function(err) {
      console.error("Service worker failed to register", err)
    })
  }
}
