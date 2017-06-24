db = require "lapis.db"

import preload from require "lapis.db.model"

import trim_filter from require "lapis.util"
import assert_valid from require "lapis.validate"
import assert_error from require "lapis.application"

import Songs from require "models"
import Flow from require "lapis.flow"

class SongsFlow extends Flow
  list_songs: =>
    pager = Songs\paginated {
      per_page: 10
      order: "id desc"
      prepare_results: (songs) ->
        preload songs, "user"
        songs
    }

    page = @params.page and tonumber(@params.page) or 0

    songs = pager\get_page!

    json: {
      success: true
      songs: for song in *songs
        {
          id: song.id
          user_id: song.user_id
          artist: song.artist
          album: song.album
          source: song.source
        }
    }

  get_song: =>
    trim_filter @params

    assert_valid @params, {
      {"song_id", exists: true, is_integer: true}
    }

    song = Songs\find @params.song_id
    assert_error song, "could not find song"

    json: {
      success: true
      song: {
        id: song.id
        user_id: song.user_id
        artist: song.artist
        album: song.album
        source: song.source
        song: song.song
      }
    }




