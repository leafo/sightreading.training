
db = require "lapis.db"
schema = require "lapis.db.schema"

import add_column, create_index, drop_index, drop_column, create_table from schema

{
  :serial, :boolean, :varchar, :integer, :text, :foreign_key, :double, :time,
  :numeric, :enum
} = schema.types

package.loaded.migrations =
  [1468122484]: =>
    create_table "users", {
      {"id", serial}
      {"username", varchar}
      {"encrypted_password", varchar}
      {"email", varchar}
      {"slug", varchar}

      {"last_active_at", time null: true}
      {"display_name", varchar null: true}

      {"created_at", time}
      {"updated_at", time}

      "PRIMARY KEY (id)"
    }

    create_index "users", "slug", unique: true

    create_index "users", db.raw("lower(email)"), unique: true
    create_index "users", db.raw("lower(username)"), unique: true

  [1468248948]: =>
    create_table "hourly_hits", {
      {"user_id", foreign_key}
      {"hour", time default: db.raw "date_trunc('hour', now() at time zone 'utc')"}
      {"type", enum}
      {"count", integer}

      "PRIMARY KEY (user_id, hour, type)"
    }

  [1471017619]: =>
    create_table "presets", {
      {"id", serial}
      {"user_id", foreign_key}

      {"data", "jsonb not null"}

      {"created_at", time}
      {"updated_at", time}

      "PRIMARY KEY (id)"
    }

  [1472141760]: =>
    add_column "presets", "name", varchar


  [1487280271]: =>
    create_table "songs", {
      {"id", serial}
      {"user_id", foreign_key}
      {"title", text}

      {"artist", text null: true}
      {"album", text null: true}
      {"source", text null: true}

      {"song", text}
      {"players", integer default: 0}

      {"created_at", time}
      {"updated_at", time}

      "PRIMARY KEY (id)"
    }

  [1502811966]: =>
    add_column "users", "admin", boolean default: false


  [1520154640]: =>
    add_column "songs", "publish_status", enum default: 1

  [1528359105]: =>
    add_column "songs", "notes_count", integer null: true, default: db.NULL
    add_column "songs", "beats_duration", double null: true, default: db.NULL

  [1528871228]: =>
    add_column "songs", "original_song_id", foreign_key null: true
    create_index "songs", "original_song_id", where: "original_song_id is not null"

  [1530722873]: =>
    add_column "songs", "has_autochords", boolean null: true

  [1531767217]: =>
    create_table "song_user_time", {
      {"user_id", foreign_key}
      {"song_id", foreign_key}

      {"time_spent", integer default: 0}

      {"created_at", time}
      {"updated_at", time}

      "PRIMARY KEY (user_id, song_id)"
    }


  [1792195200]: =>
    add_column "users", "trainer_preferences", "jsonb not null default '{}'::jsonb"


  [1793577600]: =>
    db.query [[CREATE TABLE feedback_issues (
      issue_number integer PRIMARY KEY CHECK (issue_number > 0),
      vote_comment_id bigint,
      synced_count integer NOT NULL DEFAULT -1,
      synced_threshold integer NOT NULL DEFAULT 0,
      sync_after timestamp NOT NULL DEFAULT now(),
      sync_lease timestamp NOT NULL DEFAULT now()
    )]]
    db.query [[CREATE TABLE feedback_votes (
      issue_number integer NOT NULL REFERENCES feedback_issues(issue_number),
      user_id integer NOT NULL REFERENCES users(id),
      created_at timestamp NOT NULL DEFAULT now(),
      PRIMARY KEY (issue_number, user_id)
    )]]
    db.query [[CREATE TABLE feedback_submissions (
      id serial PRIMARY KEY,
      user_id integer NOT NULL REFERENCES users(id),
      request_key varchar(64) NOT NULL,
      day date NOT NULL DEFAULT current_date,
      daily_slot integer NOT NULL CHECK (daily_slot BETWEEN 1 AND 5),
      title text NOT NULL,
      description text NOT NULL,
      issue_number integer,
      created_at timestamp NOT NULL DEFAULT now(),
      UNIQUE (user_id, request_key),
      UNIQUE (user_id, day, daily_slot)
    )]]
    create_index "feedback_submissions", "user_id", "created_at"


  [1794960000]: =>
    db.query "ALTER TABLE feedback_votes ADD COLUMN id bigserial UNIQUE NOT NULL"
    db.query "ALTER TABLE feedback_votes ADD COLUMN username text"
    db.query "UPDATE feedback_votes v SET username = u.username FROM users u WHERE u.id = v.user_id"
    db.query "ALTER TABLE feedback_votes ALTER COLUMN username SET NOT NULL"
    db.query "ALTER TABLE feedback_votes ADD COLUMN comment_id bigint"
    create_index "feedback_votes", "issue_number", where: "comment_id is null"
