lapis = require "lapis"

import capture_errors_json from require "lapis.application"

class extends lapis.Application
  @before_filter =>
    import Users from require "models"
    @current_user = Users\read_session @

    if @current_user
      @current_user\update_last_active!

  "/(*)": =>
    res = ngx.location.capture "/static/index.html"
    error "Failed to include SSI 'index.html' (#{res.status})" unless res.status == 200
    res.body, layout: false

  "/login.json": capture_errors_json =>
    -- TODO: add csrf
    @flow("login_flow")\do_login!
    json: { success: true, params: @params }

  "/register.json": capture_errors_json =>
    -- TODO: add csrf
    @flow("login_flow")\do_register!
    json: { success: true, params: @params }

