import use_test_server from require "lapis.spec"
import request from require "lapis.spec.server"
import truncate_tables from require "lapis.spec.db"

describe "app", ->
  use_test_server!

  it "gets main page", ->
    status = request "/"
    assert.same 200, status
