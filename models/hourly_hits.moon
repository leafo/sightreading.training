db = require "lapis.db"
import Model, enum from require "lapis.db.model"

import insert_on_conflict_update from require "helpers.models"

-- Generated schema dump: (do not edit)
--
-- CREATE TABLE hourly_hits (
--   user_id integer NOT NULL,
--   hour timestamp without time zone DEFAULT date_trunc('hour'::text, timezone('utc'::text, now())) NOT NULL,
--   type smallint NOT NULL,
--   count integer DEFAULT 0 NOT NULL
-- );
-- ALTER TABLE ONLY hourly_hits
--   ADD CONSTRAINT hourly_hits_pkey PRIMARY KEY (user_id, hour, type);
--
class HourlyHits extends Model
  @types: enum {
    hit: 1
    miss: 2
  }

  @relations: {
    {"user", belongs_to: "Users"}
  }

  @increment: (user_id, t, count=1) =>
    t = @types\for_db t

    insert_on_conflict_update @, {
      user_id: assert user_id, "missing user id"
      type: t
      hour: db.raw "default"
    }, {
      :count
    }, {
      count: db.raw "#{db.escape_identifier @table_name!}.count + excluded.count"
    }

