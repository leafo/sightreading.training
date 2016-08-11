
import respond_to from require "lapis.application"
import assert_csrf from require "helpers.csrf"

post = (fn) ->
  respond_to {
    on_error: =>
      json: { errors: @errors }

    POST: =>
      assert_csrf @
      fn @
  }

get = (fn) ->
  respond_to {
    on_error: =>
      json: { errors: @errors }

    GET: fn
  }

{:get, :post}
