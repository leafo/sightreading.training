db = require "lapis.db"
import Model from require "lapis.db.model"

import to_json from require "lapis.util"

-- Generated schema dump: (do not edit)
--
-- CREATE TABLE presets (
--   id integer NOT NULL,
--   user_id integer NOT NULL,
--   data jsonb NOT NULL,
--   created_at timestamp without time zone NOT NULL,
--   updated_at timestamp without time zone NOT NULL,
--   name character varying(255) NOT NULL
-- );
-- ALTER TABLE ONLY presets
--   ADD CONSTRAINT presets_pkey PRIMARY KEY (id);
--
class Presets extends Model
  @timestamp: true

  @relations: {
    {"user", belongs_to: "Users"}
  }

  @create: (opts={}) =>
    if type(opts.data) == "table"
      opts.data = to_json opts.data

    super opts, returning: "*" -- load the json

