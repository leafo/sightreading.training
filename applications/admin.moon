lapis = require "lapis"

import assert_error, capture_errors_json from require "lapis.application"

import preload from require "lapis.db.model"

class extends lapis.Application
  @name: "admin."
  @path: "/admin"

  @before_filter =>
    unless @current_user and @current_user\is_admin!
      @write status: 404

  "/home": capture_errors_json =>
    assert_error @current_user and @current_user\is_admin!, "not admin"
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

