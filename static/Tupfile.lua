tup.creategitignore()

tup.rule({ "scss/*.css" }, join, "style.css")
tup.rule({ "js/service_worker/*.js" }, join, "service_worker.js")

tup.rule({
  "js/*.js",
  "js/components/*.js",
  "js/components/pages/*.js ",
}, join, "main.js")

tup.rule({
  "pre_libs.js",
  "../node_modules/babel-polyfill/dist/polyfill.js",
  "../node_modules/classnames/index.js",
  "../node_modules/nosleep.js/dist/NoSleep.js",
  "../node_modules/mersennetwister/src/MersenneTwister.js",
  "../node_modules/react/umd/react.development.js",
  "../node_modules/react-dom/umd/react-dom.development.js",
  "../node_modules/prop-types/prop-types.js",
  "../node_modules/react-transition-group/dist/react-transition-group.js",
  "../node_modules/react-router/umd/react-router.js",
  "../node_modules/react-router-dom/umd/react-router-dom.js",
  "../node_modules/chart.js/dist/Chart.js",
  "../node_modules/react-chartjs-2/dist/react-chartjs-2.js",
  "../node_modules/moment/moment.js",
  "../node_modules/soundfont-player/dist/soundfont-player.js",
  "../node_modules/requirejs/require.js",
  "define_libs.js",
}, join, "lib-dev.js")

tup.rule({
  "pre_libs.js",
  "../node_modules/babel-polyfill/dist/polyfill.js",
  "../node_modules/classnames/index.js",
  "../node_modules/nosleep.js/dist/NoSleep.js",
  "../node_modules/mersennetwister/src/MersenneTwister.js",
  "../node_modules/react/umd/react.production.min.js",
  "../node_modules/react-dom/umd/react-dom.production.min.js",
  "../node_modules/prop-types/prop-types.js",
  "../node_modules/react-transition-group/dist/react-transition-group.js",
  "../node_modules/react-router/umd/react-router.min.js",
  "../node_modules/react-router-dom/umd/react-router-dom.min.js",
  "../node_modules/chart.js/dist/Chart.js",
  "../node_modules/react-chartjs-2/dist/react-chartjs-2.js",
  "../node_modules/moment/min/moment.min.js",
  "../node_modules/soundfont-player/dist/soundfont-player.min.js",
  "../node_modules/requirejs/require.js",
  "define_libs.js",
}, join, "lib.js")

tup.rule({
  "../node_modules/jasmine-core/lib/jasmine-core/boot.js"
}, "../node_modules/.bin/babel --plugins transform-es2015-modules-amd --module-id 'jasmine_boot' %f > %o", "jasmine_boot.js")

tup.rule({
  "../node_modules/jasmine-core/lib/jasmine-core/jasmine.js",
  "../node_modules/jasmine-core/lib/jasmine-core/jasmine-html.js",
}, join, "spec.js")

tup.rule({
  "../node_modules/jasmine-core/lib/jasmine-core/jasmine.css"
}, join, "spec.css")

tup.foreach_rule({
  "lib.js",
  "main.js",
  "service_worker.js",
}, "uglifyjs %f > %o", "%B.min.js")

-- vim: set expandtab ts=2 sw=2 ft=lua:
