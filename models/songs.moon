db = require "lapis.db"
import Model from require "lapis.db.model"
import slugify from require "lapis.util"

-- Generated schema dump: (do not edit)
--
-- CREATE TABLE songs (
--   id integer NOT NULL,
--   user_id integer NOT NULL,
--   title text NOT NULL,
--   artist text,
--   album text,
--   source text,
--   song text NOT NULL,
--   players integer DEFAULT 0 NOT NULL,
--   created_at timestamp without time zone NOT NULL,
--   updated_at timestamp without time zone NOT NULL
-- );
-- ALTER TABLE ONLY songs
--   ADD CONSTRAINT songs_pkey PRIMARY KEY (id);
--
class Songs extends Model
  @timestamp: true

  @relations: {
    {"user", belongs_to: "Users"}
  }

  get_slug: =>
    slugify @title


  allowed_to_edit: (user) =>
    return false unless user
    return true if user\is_admin!
    user.id == @user_id
