
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

