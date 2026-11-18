-- Probe with its own bounded connection, independent of sessions and migrations.
-- Never expose a connection error or change the normal migration timeout.
check = ->
  connection = nil
  ok = pcall ->
    postgres = require "pgmoon"
    config = require("lapis.config").get!
    connection = postgres.new config.postgres
    connection\settimeout 1000
    assert connection\connect!
    assert connection\query "select trainer_preferences from users limit 0"
    if os.getenv("SR_FEEDBACK_ENABLED") == "1"
      assert connection\query "select issue_number, synced_count, synced_threshold, sync_lease, sync_after from feedback_issues limit 0"
      assert connection\query "select issue_number, user_id, id, username, comment_id from feedback_votes limit 0"
      assert connection\query "select request_key, day, daily_slot, issue_number from feedback_submissions limit 0"
  pcall -> connection\disconnect! if connection
  ok

{:check}
