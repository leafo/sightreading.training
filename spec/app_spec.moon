import use_test_server from require "lapis.spec"
import request from require "lapis.spec.server"
import truncate_tables from require "lapis.spec.db"

import request_as from require "spec.helpers"

factory = require "spec.factory"

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
      assert.same { success: true, songs: {} },res

    it "gets song with result", ->
      song = factory.Songs!
      status, res = request "/songs.json", expect: "json"
      assert.same 200, status

      assert.same 1, #res.songs

    it "gets song", ->
      song = factory.Songs!
      status, res = request "/songs/#{song.id}.json", expect: "json"
      assert.same 200, status
      assert.true res.success




