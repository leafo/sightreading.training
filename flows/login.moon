db = require "lapis.db"
import Flow from require "lapis.flow"

import assert_error from require "lapis.application"
import assert_valid from require "lapis.validate"
import trim from require "lapis.util"

import Users from require "models"

class LoginFlow extends Flow
  expose_assigns: true

  do_logout: =>
    @session.user = false
    true

  do_login: =>
    assert_error not @current_user, "You are already logged in"
    assert_valid @params, {
      { "username", exists: true }
      { "password", exists: true }
    }

    @current_user = assert_error Users\login trim(@params.username), trim(@params.password)
    @current_user\write_session @_

    true

  do_register: =>
    assert_error not @current_user, "You are already logged in"
    assert_valid @params, {
      { "username", exists: true, min_length: 2, max_length: 25 }
      { "password", exists: true, min_length: 2 }
      { "password_repeat", equals: @params.password }
      { "email", exists: true, min_length: 3 }
    }

    assert_error @params.email\match(".@."), "Invalid email address"

    assert_error not Users\find_by_username(@params.username), "Username taken"
    assert_error not Users\find_by_email(@params.email), "Email used on existing account"

    @current_user = assert_error Users\create {
      username: @params.username
      password: @params.password
      email: @params.email
    }

    @current_user\write_session @_

    true

