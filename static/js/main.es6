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

class BlankLayout extends React.Component {
  render() {
    return <div>
      this is blank layout
      {this.props.children}
      end of blank layout
    </div>
  }
}

export function test_page(session) {
  N.session = session || {}
  ReactDOM.render(<App layout={BlankLayout} />, document.getElementById("page"));
}
