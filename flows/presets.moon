db = require "lapis.db"

import assert_valid from require "lapis.validate"

import Presets from require "models"
import Flow from require "lapis.flow"

class HitsFlow extends Flow
  list_presets: =>
    presets = @current_user\get_presets!

    json: {
      success: true
      presets: [p.data for p in *presets]
    }

  create_preset: =>
    assert_valid @params, {
      {"preset", type: "string"}
    }

    import from_json from require "lapis.util"
    preset = from_json @params.preset

    json: {
      success: true
      :preset
    }
