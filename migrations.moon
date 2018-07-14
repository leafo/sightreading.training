
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

