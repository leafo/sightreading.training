lapis = require "lapis"

import assert_error, capture_errors_json from require "lapis.application"

class extends lapis.Application
  @name: "admin."
  @path: "/admin"

  @before_filter =>
    unless @current_user and @current_user\is_admin!
      @write status: 404

  "/home": capture_errors_json =>
    assert_error @current_user and @current_user\is_admin!, "not admin"
    render: "admin.home", layout: "layouts.admin"

