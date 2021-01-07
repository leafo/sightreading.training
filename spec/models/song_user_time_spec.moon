import use_test_env from require "lapis.spec"
import truncate_tables from require "lapis.spec.db"

db = require "lapis.db"

describe "models.song_user_time", ->
  use_test_env!

  import SongUserTime from require "spec.models"


  it "it doesn't increment time sent in quick intervals", ->
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

    assert.same 30, out.time_spent
    assert.same 1, out.user_id
    assert.same 2, out.song_id

  it "increments song user time", ->
    out = SongUserTime\increment {
      user_id: 1
      song_id: 2
      time_spent: 30
    }

    -- we set the update time back to ensure new time added is not greater than time elapsed
    out\update {
      updated_at: db.raw "now() at time zone 'utc' - '10 hours'::interval"
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
