
export function event(category, action, label, value, interactive=true) {
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
      ga('send', opts);
    } else {
      console.debug("event:", opts);
    }
  } catch (e) {}
};

N.init = function(session) {
  N.session = session || {}
  ReactDOM.render(<App />, document.getElementById("page"));
}

N.csrf_token = function() {
  return document.getElementById("csrf_token").getAttribute("content")
}

N.scope_event = (name) => `notes:${name}`

N.trigger = function(component, name, ...args) {
  const node = ReactDOM.findDOMNode(component)
  let ev = new CustomEvent(N.scope_event(name), {
    detail: args,
    bubbles: true
  })
  return node.dispatchEvent(ev)
}

N.dispatch = function(component, event_table) {
  const node = ReactDOM.findDOMNode(component)

  for (let key in event_table) {
    if (!event_table.hasOwnProperty(key)) {
      continue
    }

    (function(name, fn) {
      node.addEventListener(N.scope_event(key), function(e) {
        fn(e, ...e.detail)
      })
    })(key, event_table[key])
  }

}
