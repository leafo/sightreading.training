import config from require "lapis.config"

config {"development", "production"}, ->
  app_name "sightreading.training"

  postgres {
    backend: "pgmoon"
    database: "sightreading"
  }

config "production", ->
  code_cache "on"
