db = require "lapis.db"
import Model from require "lapis.db.model"

import insert_on_conflict_update from require "helpers.models"

class HourlyHits extends Model
  @types: enum {
    hit: 1
    miss: 1
  }

  @increment: (user_id, t) =>
    t = @types\for_db t

    insert_on_conflict_update @, {
      user_id: assert user_id, "missing user id"
      type: t
      hour: db.raw "default"
    }, {
      count: db.raw db.interpolate_query "#{db.escape_identifier @table_name!}.count + excluded.count"
    }

