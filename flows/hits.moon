
db = require "lapis.db"

import assert_error from require "lapis.application"
import assert_valid from require "lapis.validate"

import HourlyHits from require "models"

import Flow from require "lapis.flow"

class HitsFlow extends Flow
  register_hits: =>
    assert_error @current_user

    assert_valid @params, {
      {"hits", is_integer: true, optional: true}
      {"misses", is_integer: true, optional: true}
    }

    hits = tonumber @params.hits or 0
    misses = tonumber @params.misses or 0

    if hits > 0
      HourlyHits\increment @current_user.id, "hit", hits

    if misses > 0
      HourlyHits\increment @current_user.id, "miss", misses

    true

  get_stats: (range='30 days') =>
    HourlyHits\select "
      where hour >= now() at time zone 'utc' - ?::interval
      group by hour::date
    ", range, {
      fields: db.interpolate_query "
        hour::date as date,
        sum(count) filter (where type = ?) as hits,
        sum(count) filter (where type = ?) as misses
      ", HourlyHits.types.hit, HourlyHits.types.miss
    }

