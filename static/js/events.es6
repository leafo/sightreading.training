import * as ReactDOM from "react-dom"

export function scopeEvent(name) {
  return `notes:${name}`
}

export function trigger(component, name, ...args) {
  const node = ReactDOM.findDOMNode(component)
  let ev = new CustomEvent(scopeEvent(name), {
    detail: args,
    bubbles: true
  })
  return node.dispatchEvent(ev)
}


export function dispatch(component, event_table) {
  const node = ReactDOM.findDOMNode(component)

  for (let key in Object.keys(event_table)) {
    (function(name, fn) {
      node.addEventListener(scopeEvent(key), function(e) {
        fn(e, ...e.detail)
      })
    })(key, event_table[key])
  }
}
