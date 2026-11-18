import use_test_env from require "lapis.spec"

describe "website feedback", ->
  use_test_env!
  require("spec.feedback_cases")!
