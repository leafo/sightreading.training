
import Widget from require "lapis.html"

import to_json from require "lapis.util"

class Layout extends Widget
  content: =>
    html_5 ->
      head ->
        title "Sight Reading Trainer"
        link rel: "stylesheet", href: "/static/style.css"
        link rel: "stylesheet", href: "https://fonts.googleapis.com/css?family=Raleway"
        meta name: "viewport", content: "width=device-width, initial-scale=1"
        meta id: "csrf_token", name: "csrf_token", content: @csrf_token

        @google_analytics!

      body ->
        div id: "page"
        script type: "text/javascript", src: "/static/lib.js"
        script type: "text/javascript", src: "/static/main.js"
        script type: "text/javascript", ->
          raw "N.init(#{to_json @initial_state!})"

  initial_state: =>
    out = { }
    if @current_user
      out.currentUser = @flow("formatter")\user @current_user

    out

  google_analytics: =>
    script type: "text/javascript", ->
      raw [[
        if (window.location.hostname != "localhost") {
          (function(i,s,o,g,r,a,m){i['GoogleAnalyticsObject']=r;i[r]=i[r]||function(){
          (i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),
          m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m)
          })(window,document,'script','//www.google-analytics.com/analytics.js','ga');

          ga('create', 'UA-136625-1', 'auto');
          ga('send', 'pageview');
        }
      ]]
