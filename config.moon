import config from require "lapis.config"

config {"development", "production", "test"}, ->
  app_name "music-tools"
  session_name "mursic"

  daemon "off"
  notice_log "stderr"
  port 9090

  postgres {
    database: "sightreading"
  }

config "production", ->
  logging false
  runtime = require("helpers.runtime_config").production!
  daemon "off"
  notice_log "stderr"
  secret runtime.secret
  session_name runtime.session_name
  public_host runtime.public_host
  postgres runtime.postgres
  code_cache "on"
  num_workers 3
  port 10007

  default_scheme "https"


config "test", ->
  logging false
  code_cache "on"

  postgres {
    database: "sightreading_test"
  }
