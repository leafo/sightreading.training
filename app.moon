lapis = require "lapis"

class extends lapis.Application
  "/(*)": =>
    res = ngx.location.capture "/static/index.html"
    error "Failed to include SSI 'index.html' (#{res.status})" unless res.status == 200
    res.body, layout: false

  "/login.json": =>
    json: { success: true, params: @params }

  "/register.json": =>
    json: { success: true, params: @params }

