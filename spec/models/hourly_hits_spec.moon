import use_test_env from require "lapis.spec"
import truncate_tables from require "lapis.spec.db"

describe "models.hourly_hits", ->
  use_test_env!

  import HourlyHits from require "spec.models"

  it "increments hourly hits", ->
    HourlyHits\increment -1, "hit", 10
    HourlyHits\increment -2, "miss", 3
    HourlyHits\increment -1, "miss", 2
    HourlyHits\increment -2, "hit", 4
    HourlyHits\increment -1, "hit", 1
    HourlyHits\increment -2, "hit", 2

    hits = HourlyHits\select "where type = ? group by user_id", HourlyHits.types.hit, {
      fields: "user_id, sum(count)"
    }

    assert.same {
      [-1]: 11
      [-2]: 6
    }, {h.user_id, h.sum for h in *hits}

    misses =  HourlyHits\select "where type = ? group by user_id", HourlyHits.types.miss, {
      fields: "user_id, sum(count)"
    }

    assert.same {
      [-1]: 2
      [-2]: 3
    }, {h.user_id, h.sum for h in *misses}


