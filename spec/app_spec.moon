import use_test_server from require "lapis.spec"
import request from require "lapis.spec.server"
import truncate_tables from require "lapis.spec.db"

import request_as from require "spec.helpers"

factory = require "spec.factory"

import types from require "tableshape"

describe "app", ->
  use_test_server!

  import Users, Presets, HourlyHits from require "spec.models"

  it "gets main page", ->
    status = request "/"
    assert.same 200, status

  it "gets presets", ->
    status, res = request "/presets.json", {
      expect: "json"
    }

    assert.same 200, status
    assert.same {
      errors: {"must be logged in"}
    }, res

    user = factory.Users!
    status, res = request_as user, "/presets.json", {
      expect: "json"
    }

    assert.same 200, status
    assert.same {
      success: true
      presets: {}
    }, res

  describe "songs", ->
    import Songs from require "spec.models"

    it "gets songs with no results", ->
      status, res = request "/songs.json", expect: "json"
      assert.same 200, status
      assert.same { success: true },res

    it "gets song with result", ->
      song = factory.Songs{
        publish_status: "public"
      }
      status, res = request "/songs.json", expect: "json"
      assert.same 200, status

      assert.same 1, #res.songs

    it "gets song", ->
      song = factory.Songs!
      status, res = request "/songs/#{song.id}.json", expect: "json"
      assert.same 200, status
      assert.true res.success

    it "creates a song", ->
      user = factory.Users!

      status, res = request_as user, "/songs.json", {
        expect: "json"
        post: {
          "song[title]": "hello world"
          "song[song]": "g5 g5 g5"
          "song[publish_status]": "public"
        }
      }

      assert.same 200, status

      s = types.shape {
        success: true
        song: types.partial {
          id: types.number
          title: "hello world"
          publish_status: "public"
          user_id: user.id
        }
      }

      assert s res

    it "updates a song", ->
      user = factory.Users!
      song = factory.Songs user_id: user.id

      status, res = request_as user, "/songs/#{song.id}.json", {
        expect: "json"
        post: {
          "song[title]": "the new title"
          "song[song]": "g5 a5"
          "song[publish_status]": "public"
        }
      }

      assert.same 200, status
      assert.same {success: true}, res

      song\refresh!
      assert.same "the new title", song.title
      assert.same "g5 a5", song.song

    it "increments song user time", ->
      user = factory.Users!
      song = factory.Songs user_id: user.id

      status, res = request_as user, "/songs/#{song.id}/stats.json", {
        expect: "json"
        post: { }
      }

      assert.same 200, status

      assert.same {
        time_spent: 30
        success: true
      }, res

      status, res = request_as user, "/songs/#{song.id}/stats.json", {
        expect: "json"
        post: { }
      }

      assert.same {
        errors: {
          "time just updated"
        }
      }, res


  describe "all-time hit statistics", ->
    it "aggregates full history by local active day and isolates users", ->
      db = require "lapis.db"
      user = factory.Users!
      other = factory.Users!
      for row in *{
        {user.id, "2000-01-01 23:00:00", "hit", 10}
        {user.id, "2000-01-02 01:00:00", "hit", 20}
        {user.id, "2000-01-03 12:00:00", "miss", 5}
        {other.id, "2000-01-01 23:00:00", "hit", 999}
      }
        db.insert "hourly_hits", {
          user_id: row[1], hour: row[2], type: HourlyHits.types\for_db(row[3]), count: row[4]
        }
      status, res = request_as user, "/stats.json?offset=120", expect: "json"
      assert.same 200, status
      assert.same 30, tonumber res.summary.best_daily_hits
      assert.same 15, tonumber res.summary.average_daily_hits

    it "returns zero summaries for accounts without activity", ->
      user = factory.Users!
      status, res = request_as user, "/stats.json", expect: "json"
      assert.same 200, status
      assert.same 0, tonumber res.summary.best_daily_hits
      assert.same 0, tonumber res.summary.average_daily_hits

  describe "trainer preferences", ->
    it "requires an account", ->
      status, res = request "/trainer-preferences.json", {
        expect: "json", post: { preferences: "{}" }
      }
      assert.same 200, status
      assert.truthy res.errors

    it "saves preferences only for the authenticated account", ->
      import to_json from require "lapis.util"
      user = factory.Users!
      other = factory.Users!
      preferences = {
        version: 1, staff: "bass", generator: "random", key: "Gb"
        generatorSettings: { hands: 1 }
        mode: "scroll", speed: 175, keyboardOpen: false, settingsOpen: true
      }
      status, res = request_as user, "/trainer-preferences.json", {
        expect: "json", post: { preferences: to_json preferences, user_id: other.id }
      }
      assert.same 200, status
      assert.true res.success
      user\refresh!
      other\refresh!
      assert.same preferences, user.trainer_preferences
      assert.same {}, other.trainer_preferences

    it "rejects invalid preference documents", ->
      user = factory.Users!
      for payload in *{"bad json", "null", "{}", string.rep("x", 16385)}
        status, res = request_as user, "/trainer-preferences.json", {
          expect: "json", post: { preferences: payload }
        }
        assert.same 200, status
        assert.truthy res.errors

    it "rejects preference writes with invalid CSRF tokens", ->
      user = factory.Users!
      status, res = request_as user, "/trainer-preferences.json", {
        expect: "json", post: { preferences: "{}", csrf_token: "invalid" }
      }
      assert.same 200, status
      assert.same {"invalid csrf"}, res.errors
      user\refresh!
      assert.same {}, user.trainer_preferences
