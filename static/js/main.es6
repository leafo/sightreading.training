/*global N*/

import App from "st/components/app"
import * as ReactDOM from "react-dom"

import * as React from "react"

window.N = window.N || {};
N.enable_presets = false
N.init = init

export function init(session) {
  N.session = session || {}
  ReactDOM.render(<App />, document.getElementById("page"));
  installServiceWorker(session.cacheBuster)
}

export function test_page(session) {
  N.session = session || {}
  ReactDOM.render(<App layout={App.BlankLayout} />, document.getElementById("page"));
}

export function installServiceWorker(timestamp) {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register(`/sw.js?${timestamp}`).then(function(registration) {
      console.log("Service worker registered", registration.scope)
    }, function(err) {
      console.error("Service worker failed to register", err)
    })
  }
}
