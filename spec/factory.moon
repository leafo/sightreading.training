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

Users = (opts) ->
  opts.email or= next_email!
  opts.username or= next_counter "user"
  opts.password or= next_counter "password"
  models.Users\create opts

{:Users}
