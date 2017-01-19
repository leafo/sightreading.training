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
}

class TestComponent extends React.Component {
  render() {
    return <div>does this page render for google?</div>
  }
}

export function test_page(session) {
  ReactDOM.render(<TestComponent />, document.getElementById("page"));
}
