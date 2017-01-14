
import Widget from require "lapis.html"
import to_json from require "lapis.util"

buster = require "cache_buster"

config = require("lapis.config").get!

class Layout extends Widget
  content: =>
    html_5 ->
      head ->
        meta charset: "UTF-8"
        title "Sight Reading Trainer"
        link rel: "stylesheet", href: "/static/style.css?#{buster}"
        link rel: "stylesheet", href: "https://fonts.googleapis.com/css?family=Raleway"
        meta name: "viewport", content: "width=device-width, initial-scale=1"
        meta id: "csrf_token", name: "csrf_token", content: @csrf_token

        @google_analytics!

      body ->
        div id: "page"
        @include_js "lib", "main"

        if config.sentry_url
          script src: "https://cdn.ravenjs.com/3.9.1/raven.min.js"
          script ->
            raw "Raven.config(#{to_json config.sentry_url}).install()"

        script type: "text/javascript", ->
          raw [[define("window", window);]]
          raw [[define("lib", {
            classNames: classNames,
            moment: moment,
            MersenneTwister: MersenneTwister,
            chartjs: window["react-chartjs"]
          });]]
          raw [[define("react", React);]]
          raw [[define("react-dom", ReactDOM);]]
          raw [[define("react-router", ReactRouter);]]
          raw "requirejs(['st/main'], function(m) { m.init(#{to_json @initial_state!}) });"

  initial_state: =>
    out = { }
    if @current_user
      out.currentUser = @flow("formatter")\user @current_user

    out

  include_js: (...) =>
    for lib in *{...}
      if config._name == "production"
        script type: "text/javascript", src: "/static/#{lib}.min.js?#{buster}"
      else
        script type: "text/javascript", src: "/static/#{lib}.js?#{buster}"

  google_analytics: =>
    script type: "text/javascript", ->
      raw [[
        if (window.location.hostname != "localhost") {
          (function(i,s,o,g,r,a,m){i['GoogleAnalyticsObject']=r;i[r]=i[r]||function(){
          (i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),
          m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m)
          })(window,document,'script','//www.google-analytics.com/analytics.js','ga');

          ga('create', 'UA-136625-15', 'auto');
          ga('send', 'pageview');
        }
      ]]
