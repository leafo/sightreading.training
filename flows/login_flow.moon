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
    redirect_to: "/"

  do_login: =>
    assert_valid @params, {
      { "username", exists: true }
      { "password", exists: true }
    }

    @current_user = assert_error Users\login trim(@params.username), trim(@params.login)
    @current_user\write_session @_

    true

  do_register: =>
    @assert_recaptcha!

    assert_valid @params, {
      { "username", exists: true, min_length: 2, max_length: 25 }
      { "password", exists: true, min_length: 2 }
      { "password_repeat", equals: @params.password }
      { "email", exists: true, min_length: 3 }
    }

    true

