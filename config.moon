import config from require "lapis.config"

config {"development", "production", "test"}, ->
  app_name "sightreading.training"

  postgres {
    database: "sightreading"
  }

config "production", ->
  code_cache "on"
  port 10007

config "test", ->
  code_cache "on"

  postgres {
    database: "sightreading_test"
  }
