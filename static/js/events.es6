/*global ReactDOM*/

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

  for (let key in event_table) {
    if (!event_table.hasOwnProperty(key)) {
      continue
    }

    (function(name, fn) {
      node.addEventListener(scopeEvent(key), function(e) {
        fn(e, ...e.detail)
      })
    })(key, event_table[key])
  }
}
