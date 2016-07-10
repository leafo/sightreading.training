import config from require "lapis.config"

config {"development", "production"}, ->
  app_name "sightreading.training"

config "production", ->
  code_cache "on"
