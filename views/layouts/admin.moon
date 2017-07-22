
import Widget from require "lapis.html"

class AdminLayout extends Widget
  content: =>
    @content_for "inner"
