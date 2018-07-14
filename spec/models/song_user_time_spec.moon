import use_test_env from require "lapis.spec"
import truncate_tables from require "lapis.spec.db"

describe "models.hourly_hits", ->
  use_test_env!

  import SongUserTime from require "spec.models"

  it "increments song user time", ->
    out = SongUserTime\increment {
      user_id: 1
      song_id: 2
      time_spent: 30
    }

    assert.same 30, out.time_spent
    assert.same 1, out.user_id
    assert.same 2, out.song_id

    SongUserTime\increment {
      user_id: 1
      song_id: 2
      time_spent: 22
    }

    out\refresh!

    assert.same 52, out.time_spent
    assert.same 1, out.user_id
    assert.same 2, out.song_id
