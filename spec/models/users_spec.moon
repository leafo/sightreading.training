describe "models.users", ->
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

  describe "password_is_outdated", ->
    it "detects if password is outdated", ->
      user = Users\create {
        username: "leafo"
        password: "the-password"
        email: "hello@leafo.net"
      }

      assert.false user\password_is_outdated!, "fresh password is not outdated"

      -- outdated prefix
      user\update encrypted_password: "$2y$07$the2brest"

      assert.true user\password_is_outdated!


      -- outdated rounds prefix
      user\update encrypted_password: "$2b$05$the07rest"

      assert.true user\password_is_outdated!
