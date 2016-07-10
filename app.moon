lapis = require "lapis"

import capture_errors_json from require "lapis.application"

class extends lapis.Application
  layout: require "views.layout"

  cookie_attributes: =>
    expires = date(true)\adddays(365)\fmt "${http}"
    attr = "Expires=#{expires}; Path=/; HttpOnly"
    attr

  @before_filter =>
    import Users from require "models"
    @current_user = Users\read_session @

    if @current_user
      @current_user\update_last_active!

  "/(*)": =>

  "/logout.json": capture_errors_json =>
    -- TODO: add csrf
    @flow("login")\do_logout!
    json: { success: true }

  "/login.json": capture_errors_json =>
    -- TODO: add csrf
    @flow("login")\do_login!
    json: @flow("formatter")\session!

  "/register.json": capture_errors_json =>
    -- TODO: add csrf
    @flow("login")\do_register!
    json: @flow("formatter")\session!

