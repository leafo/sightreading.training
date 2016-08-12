import use_test_server from require "lapis.spec"
import request from require "lapis.spec.server"
import truncate_tables from require "lapis.spec.db"

describe "app", ->
  use_test_server!

  import Users, Presets, HourlyHits from require "models"

  it "gets main page", ->
    status = request "/"
    assert.same 200, status

  it "gets presets", ->
    status = request "/presets.json"
    assert.same 200, status


