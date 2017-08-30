lapis = require "lapis"

import assert_error, capture_errors_json from require "lapis.application"

import assert_valid from require "lapis.validate"

import preload from require "lapis.db.model"

class extends lapis.Application
  @name: "admin."
  @path: "/admin"

  @before_filter =>
    unless @current_user and @current_user\is_admin!
      @write status: 404, layout: false, "not found"

  "/home": capture_errors_json =>
    import Users, Songs, HourlyHits from require "models"

    @users = Users\select "order by id desc limit 50"
    @songs = Songs\select "order by id desc limit 50"
    preload @songs, "user"

    @counts = HourlyHits\select "
      where hour > now() at time zone 'utc' - '30 days'::interval
      group by type, hour::date
      order by hour::date desc, type
    ", fields: "hour::date as date, sum(count) as count, type"

    render: "admin.home", layout: "layouts.admin"


  [user: "/users/:user_id"]: capture_errors_json =>
    import Users from require "models"
    assert_valid @params, {
      {"user_id", is_integer: true}
    }

    @user = assert_error Users\find(@params.user_id), "invalid user"
    render: true, layout: "layouts.admin"



