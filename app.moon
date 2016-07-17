lapis = require "lapis"

import respond_to from require "lapis.application"
import set_csrf, assert_csrf from require "helpers.csrf"

date = require "date"

post = (fn) ->
  respond_to {
    on_error: =>
      json: { errors: @errors }

    POST: =>
      assert_csrf @
      fn @
  }

class extends lapis.Application
  layout: require "views.layout"

  cookie_attributes: =>
    expires = date(true)\adddays(365)\fmt "${http}"
    attr = "Expires=#{expires}; Path=/; HttpOnly"
    attr

  @before_filter =>
    import Users from require "models"
    set_csrf @

    @current_user = Users\read_session @

    if @current_user
      @current_user\update_last_active!

  "/(*)": =>

  "/logout.json": post =>
    @flow("login")\do_logout!
    json: { success: true }

  "/login.json": post =>
    @flow("login")\do_login!
    json: @flow("formatter")\session!

  "/register.json": post =>
    @flow("login")\do_register!
    json: @flow("formatter")\session!

  "/hits.jon": post =>
    @flow("hits")\register_hits!
    json: { success: true }


