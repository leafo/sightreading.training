lapis = require "lapis"

class extends lapis.Application
  "/": =>
    res = ngx.location.capture "/static/index.html"
    error "Failed to include SSI 'index.html' (#{res.status})" unless res.status == 200
    res.body, layout: false
