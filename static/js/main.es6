import App from "st/components/app"

export function init(session) {
  window.N = window.N || {};
  N.enable_presets = false
  N.session = session || {}

  ReactDOM.render(<App />, document.getElementById("page"));
}

