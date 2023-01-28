db = require "lapis.db"
import Model from require "lapis.db.model"
import slugify, from_json from require "lapis.util"

bcrypt = require "bcrypt"
date = require "date"

BCRYPT_ROUNDS = 7

unless bcrypt.salt
  bcrypt.salt = (v) -> v

strip_non_ascii = do
  filter_chars = (c, ...) ->
    return unless c
    if c >= 32 and c <= 126
      c, filter_chars ...
    else
      filter_chars ...

  (str) ->
    string.char filter_chars str\byte 1, -1

-- Generated schema dump: (do not edit)
--
-- CREATE TABLE users (
--   id integer NOT NULL,
--   username character varying(255) NOT NULL,
--   encrypted_password character varying(255) NOT NULL,
--   email character varying(255) NOT NULL,
--   slug character varying(255) NOT NULL,
--   last_active_at timestamp without time zone,
--   display_name character varying(255),
--   created_at timestamp without time zone NOT NULL,
--   updated_at timestamp without time zone NOT NULL
-- );
-- ALTER TABLE ONLY users
--   ADD CONSTRAINT users_pkey PRIMARY KEY (id);
-- CREATE UNIQUE INDEX users_lower_email_idx ON users USING btree (lower((email)::text));
-- CREATE UNIQUE INDEX users_lower_username_idx ON users USING btree (lower((username)::text));
-- CREATE UNIQUE INDEX users_slug_idx ON users USING btree (slug);
--
class Users extends Model
  @timestamp: true

  @relations: {
    {"presets", has_many: "Presets"}
  }

  @read_session: (r) =>
    if user_session = r.session.user
      if user_session.id
        user = @find user_session.id
        if user and user\salt! == user_session.key
          user

  @login: (username, password) =>
    username = username\lower!

    user = @find_by_username username
    unless user
      user = @find_by_email username

    if user and user\check_password password
      if user\is_deleted!
        return nil, "Account no longer exists"

      -- see if password is outdated and rehash it
      if user\password_is_outdated!
        user\update_password password

      user
    else
      nil, "Incorrect username or password"

  @find_by_username: (username) =>
    Users\find { [db.raw("lower(username)")]: username\lower! }

  @find_by_email: (email) =>
    Users\find { [db.raw("lower(email)")]: email\lower! }

  @create: (opts) =>
    assert opts.username, "missing username"
    assert opts.password, "missing password"
    assert opts.email, "missing email"

    opts.encrypted_password = bcrypt.digest opts.password, bcrypt.salt BCRYPT_ROUNDS
    opts.password = nil

    stripped = strip_non_ascii opts.username
    return nil, "username must be ASCII only" unless stripped == opts.username

    opts.slug or= slugify opts.username
    assert opts.slug != "", "slug is empty"
    super opts

  check_password: (pass) =>
    -- this is to allow the invalid 2y format type to gracfully upgrade, the
    -- password will be re-hashed on next login
    hash = @encrypted_password\gsub "^%$2y%$", "$2b$"
    bcrypt.verify pass, hash

  password_is_outdated: =>
    return false unless @encrypted_password

    -- old format string
    if @encrypted_password\match "^%$2y%$"
      return true

    -- rounds mismatch
    rounds_str = "%02d"\format BCRYPT_ROUNDS
    unless @encrypted_password\match "^%$..%$#{rounds_str}%$"
      return true

    false

  update_password: (pass, r) =>
    @update encrypted_password: bcrypt.digest pass, bcrypt.salt BCRYPT_ROUNDS
    @write_session r if r

  write_session: (r) =>
    r.session.user = {
      id: @id
      key: @salt!
    }

  salt: =>
    @encrypted_password\sub 1, 29

  is_deleted: => false

  update_last_active: =>
    span = if @last_active_at
      date.diff(date(true), date(@last_active_at))\spandays!

    if not span or span > 1
      @update { last_active_at: db.format_date! }, timestamp: false

  is_admin: => @admin

  name_for_display: =>
    @display_name or @username

