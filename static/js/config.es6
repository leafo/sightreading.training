export function storageAvailable(type) {
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

export function writeConfig(name, value) {
  if (storageAvailable("localStorage")) {
    if (typeof value != "string") {
      value = JSON.stringify(value)
    }

    console.warn("Writing config", name, value)
    return window.localStorage.setItem(name, value)
  }
}

export function readConfig(name, defaultValue=undefined) {
  if (storageAvailable("localStorage")) {
    console.warn("Reading config", name)
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

