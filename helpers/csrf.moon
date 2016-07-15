
import assert_error from require "lapis.application"

set_csrf = =>
  unless @session.csrf_token
    import generate_key from require "helpers.keys"
    @session.csrf_token = generate_key 40

  @csrf_token = @session.csrf_token

assert_csrf = =>
  assert_error @params.csrf_token == @csrf_token, "invalid csrf"


{:set_csrf, :assert_csrf}
