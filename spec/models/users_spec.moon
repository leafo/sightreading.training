import use_test_env from require "lapis.spec"
import truncate_tables from require "lapis.spec.db"

describe "models.users", ->
  use_test_env!

  import Users from require "spec.models"

  it "creates a user", ->
    user = Users\create {
      username: "leafo"
      password: "the-password"
      email: "hello@leafo.net"
    }

    assert user, "failed to create user"

    found = Users\login "leafo", "the-password"
    assert.same found.id, user.id

    found = Users\login "leafo", "bad password"
    assert.nil found


