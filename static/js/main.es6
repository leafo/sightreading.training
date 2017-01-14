/*global N*/

import App from "st/components/app"
import * as ReactDOM from "react-dom"

window.N = window.N || {};
N.enable_presets = false
N.init = init

export function init(session) {
  N.session = session || {}
  ReactDOM.render(<App />, document.getElementById("page"));
}

