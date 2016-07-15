lapis = require "lapis"

import capture_errors_json from require "lapis.application"

date = require "date"

class extends lapis.Application
  layout: require "views.layout"

  cookie_attributes: =>
    expires = date(true)\adddays(365)\fmt "${http}"
    attr = "Expires=#{expires}; Path=/; HttpOnly"
    attr

  @before_filter =>
    import Users from require "models"
    unless @session.csrf_token
      import generate_key from require "helpers.keys"
      @session.csrf_token = generate_key 40

    @csrf_token = @session.csrf_token

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

