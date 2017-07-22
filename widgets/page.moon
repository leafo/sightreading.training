
import Widget from require "lapis.html"

class Page extends Widget
  content: =>
    div class: "page", ->
      @inner_content!

  inner_content: =>
