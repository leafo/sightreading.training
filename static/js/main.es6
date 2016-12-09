
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

N.scopeEvent = (name) => `notes:${name}`

N.trigger = function(component, name, ...args) {
  const node = ReactDOM.findDOMNode(component)
  let ev = new CustomEvent(N.scopeEvent(name), {
    detail: args,
    bubbles: true
  })
  return node.dispatchEvent(ev)
}

N.setTitle = function(title) {
  if (title) {
    document.title = `${title} | Sight Reading Trainer`
  } else {
    document.title = "Sight Reading Trainer"
  }
}

N.dispatch = function(component, event_table) {
  const node = ReactDOM.findDOMNode(component)

  for (let key in event_table) {
    if (!event_table.hasOwnProperty(key)) {
      continue
    }

    (function(name, fn) {
      node.addEventListener(N.scopeEvent(key), function(e) {
        fn(e, ...e.detail)
      })
    })(key, event_table[key])
  }
}

N.storageAvailable = function(type) {
  try {
    let storage = window[type]
    let x = "__test";
    storage.setItem(x, x)
    storage.removeItem(x)
    return true
  } catch(e) {
    return false
  }
}

N.writeConfig = function(name, value) {
  if (N.storageAvailable("localStorage")) {
    if (typeof value != "string") {
      value = JSON.stringify(value)
    }

    return window.localStorage.setItem(name, value)
  }
}

N.readConfig = function(name, defaultValue=undefined) {
  if (N.storageAvailable("localStorage")) {
    let ret = window.localStorage.getItem(name)
    if (ret == undefined) {
      ret = defaultValue
    } else {
      try {
        ret = JSON.parse(ret)
      } catch (e) {}
    }

    return ret
  } else {
    return defaultValue
  }
}

