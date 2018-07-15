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
        }
      }

      assert.same 200, status

      s = types.shape {
        success: true
        song: types.shape {
          id: types.number
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

