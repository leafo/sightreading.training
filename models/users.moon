db = require "lapis.db"
import Model from require "lapis.db.model"
import slugify, from_json from require "lapis.util"

bcrypt = require "bcrypt"

strip_non_ascii = do
  filter_chars = (c, ...) ->
    return unless c
    if c >= 32 and c <= 126
      c, filter_chars ...
    else
      filter_chars ...

  (str) ->
    string.char filter_chars str\byte 1, -1

class Users extends Model
  @timestamp: true

  @login: (username, password) =>
    username = username\lower!

    user = Users\find { [db.raw("lower(username)")]: username }
    unless user
      user = Users\find { [db.raw("lower(email)")]: username }

    if user and user\check_password password
      if user\is_deleted!
        return nil, "Account no longer exists"
      user
    else
      nil, "Incorrect username or password"

  @create: =>
    assert opts.username, "missing username"
    assert opts.password, "missing password"
    assert opts.email, "missing email"

    opts.encrypted_password = bcrypt.digest opts.password, bcrypt.salt 5
    opts.password = nil

    stripped = strip_non_ascii opts.username
    return nil, "username must be ASCII only" unless stripped == opts.username

    opts.slug or= slugify opts.username
    assert opts.slug != "", "slug is empty"
    super opts

  check_password: (pass) =>
    bcrypt.verify pass, @encrypted_password

  update_password: (pass, r) =>
    @update encrypted_password: bcrypt.digest pass, bcrypt.salt 5
    @write_session r if r

  write_session: (r) =>
    r.session.user = {
      id: @id
      key: @salt!
    }

  salt: =>
    @encrypted_password\sub 1, 29

  is_deleted: => false
