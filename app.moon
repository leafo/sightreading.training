lapis = require "lapis"

import assert_error from require "lapis.application"
import set_csrf from require "helpers.csrf"

import get, post from require "helpers.app"

date = require "date"

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

  "/hits.json": post =>
    @flow("hits")\register_hits!
    json: { success: true }

  "/stats.json": get =>
    assert_error @current_user, "must be logged in"
    stats = @flow("hits")\get_stats!
    stats = nil unless next stats

    json: { success: true, :stats }

  "/presets.json": get =>
    assert_error @current_user, "must be logged in"
    @flow("presets")\list_presets!

  "/new-preset.json": post =>
    @flow("presets")\create_preset!
