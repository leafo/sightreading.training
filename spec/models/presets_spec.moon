import use_test_env from require "lapis.spec"
import truncate_tables from require "lapis.spec.db"

describe "models.presets", ->
  import Users, Presets from require "spec.models"

  use_test_env!

  before_each ->

  it "creates a preset", ->
    p = Presets\create {
      user_id: -1
      data: {
        type: "cool"
      }
    }

    assert.same {
      type: "cool"
    }, p.data
