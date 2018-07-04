db = require "lapis.db"

import preload from require "lapis.db.model"

import trim_filter from require "lapis.util"
import assert_valid from require "lapis.validate"
import assert_error from require "lapis.application"

import Songs from require "models"
import Flow from require "lapis.flow"

import types from require "tableshape"
shapes = require "helpers.shapes"

arrayify = ((types.equivalent({}) / nil) + types.any)\transform

class SongsFlow extends Flow
  format_song: (song, for_render=false) =>
    user = song\get_user!

    {
      id: song.id
      url: @url_for "song", song_id: song.id, slug: song\get_slug!
      title: song.title

      song: for_render and song.song or nil

      notes_count: song.notes_count
      beats_duration: song.beats_duration
      publish_status: Songs.publish_statuses\to_name song.publish_status

      user_id: song.user_id
      allowed_to_edit: not not song\allowed_to_edit @current_user
      artist: song.artist
      album: song.album
      source: song.source
      created_at: song.created_at
      updated_at: song.updated_at
      user: {
        id: user.id
        name: user\name_for_display!
      }
    }

  list_songs: =>
    pager = Songs\paginated "where publish_status = ?",
      Songs.publish_statuses.public, {
        per_page: 10
        order: "id desc"
        prepare_results: (songs) ->
          preload songs, "user"
          songs
      }

    page = @params.page and tonumber(@params.page) or 0

    my_songs = if @current_user
      Songs\select "where user_id = ? order by updated_at desc", @current_user.id

    if my_songs
      preload my_songs, "user"

    songs = pager\get_page page

    json: {
      success: true
      my_songs: if my_songs
        arrayify [@format_song song for song in *my_songs]

      songs: arrayify [@format_song song for song in *songs]
    }

  find_song: =>
    assert_valid @params, {
      {"song_id", exists: true, is_integer: true}
    }

    song = Songs\find @params.song_id
    assert_error song, "could not find song"
    song

  get_song: =>
    trim_filter @params
    song = @find_song!

    json: {
      success: true
      song: @format_song song, true
    }

  validate_song_params: (create=false) =>
    trim_filter @params
    assert_valid @params, {
      {"song", type: "table"}
    }

    params = shapes.assert_params @params, {
      song: types.shape {
        title: shapes.truncated_text(160)
        song: shapes.truncated_text(1024*10)

        source: shapes.db_nullable shapes.truncated_text(250)
        album: shapes.db_nullable shapes.truncated_text(250)
        artist: shapes.db_nullable shapes.truncated_text(250)

        has_autochords: types.one_of {
          types.literal("true") / true
          types.any / false
        }

        publish_status: shapes.db_enum(Songs.publish_statuses)

        notes_count: shapes.db_nullable shapes.integer
        beats_duration: shapes.db_nullable shapes.number

        original_song_id: create and shapes.db_nullable(shapes.db_id) or nil

      }, extra_fields: types.any / nil
    }

    params.song

  update_song: =>
    song = @find_song!
    assert_error song\allowed_to_edit(@current_user), "you are not allowed to edit this song"
    update = @validate_song_params!

    diff = shapes.difference update, song
    if next diff
      song\update {k, update[k] for k in pairs diff}

    json: {
      success: true
    }

  delete_song: =>
    song = @find_song!
    assert_error song\allowed_to_edit @current_user
    song\delete!

    json: {
      success: true
      redirect_to: @url_for "play_along"
    }

  create_song: =>
    song_params = @validate_song_params true
    song_params.user_id = @current_user.id
    song = Songs\create song_params

    json: {
      success: true
      song: @format_song song
    }

