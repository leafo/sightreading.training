
import HourlyHits from require "models"

class AdminHome extends require "widgets.page"
  @needs: {"users", "songs", "counts"}

  inner_content: =>
    h1 "Home"
    @render_users!
    @render_songs!
    @render_counts!

  render_users: =>
    h2 "Users"
    element "table", ->
      thead ->
        tr ->
          td "id"
          td "username"
          td "email"
          td "created_at"

      for user in *@users
        tr ->
          td user.id
          td ->
            a href: @url_for("admin.user", user_id: user.id),
              user.username
          td user.email
          td user.created_at

  render_songs: =>
    h2 "Songs"
    element "table", ->
      thead ->
        tr ->
          td "id"
          td "title"
          td "created_at"

      for song in *@songs
        tr ->
          td song.id
          td song.title
          td song.created_at

  render_counts: =>
    h2 "Hit counts"
    element "table", ->
      thead ->
        tr ->
          td "day"
          td "type"
          td "count"

      for tuple in *@counts
        tr ->
          td tuple.date
          td HourlyHits.types[tuple.type]
          td tuple.count

