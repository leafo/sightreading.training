
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
  ReactDOM.render(<App session={session} />, document.getElementById("page"));
};

