models = require "models"
db = require "lapis.db"

import Model from require "lapis.db.model"

import slugify from require "lapis.util"

next_counter = do
  counters = setmetatable {}, __index: => 1
  (name) ->
    with counters[name]
      counters[name] += 1

next_email = ->
  "me-#{next_counter "email"}@example.com"

local *

Users = (opts={}) ->
  opts.email or= next_email!
  opts.username or= "user #{next_counter "user"}"
  opts.password or= "password #{next_counter "password"}"
  models.Users\create opts

Songs = (opts={}) ->
  opts.user_id or= Users!.id
  opts.title or= "Song #{next_counter "song"}"
  opts.song or= "c4 d4 f4 e4"
  models.Songs\create opts

{:Users, :Songs}
