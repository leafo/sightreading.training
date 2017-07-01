
import escape from require "lapis.util"
csrf = require "lapis.csrf"

import request from require "lapis.spec.server"

-- returns headers for logged in user
log_in_user_session = (user) ->
  config = require("lapis.config").get "test"
  import encode_session from require "lapis.session"

  stub = {
    session: {
      csrf_token: "helloworld"
    }
  }

  user\write_session stub
  val = escape encode_session stub.session

  "#{config.session_name}=#{val}"

append_cookie = (opts, cookie) ->
  opts.headers or= {}
  if opts.headers.Cookie
    opts.headers.Cookie ..= "; #{cookie}"
  else
    opts.headers.Cookie = cookie

add_csrf = (opts) ->
  import cookie_name from require "helpers.csrf"
  opts.post.csrf_token = "helloworld"
  opts

request_as = (user, url, opts={}) ->
  if user
    append_cookie opts, log_in_user_session user

  request_fn = if fn = opts.request_fn
    opts.request_fn = nil
    fn
  else
    request

  if opts.post and opts.post.csrf_token == nil
    add_csrf opts

  request_fn url, opts


{:request_as}
