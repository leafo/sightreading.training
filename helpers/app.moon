
import respond_to from require "lapis.application"
import assert_csrf from require "helpers.csrf"
import capture_errors_json from require "lapis.application"

post = (fn) ->
  capture_errors_json respond_to {
    POST: =>
      assert_csrf @
      fn @
  }

get = (fn) ->
  capture_errors_json respond_to {
    GET: fn
  }

multi = (tbl) ->
  capture_errors_json respond_to {
    GET: tbl.get

    DELETE: tbl.delete and =>
      assert_csrf @
      tbl.delete @

    POST: tbl.post and =>
      assert_csrf @
      tbl.post @
  }

{:get, :post, :multi}
