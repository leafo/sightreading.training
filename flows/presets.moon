db = require "lapis.db"

import trim_filter from require "lapis.util"
import assert_valid from require "lapis.validate"

import Presets from require "models"
import Flow from require "lapis.flow"

class HitsFlow extends Flow
  list_presets: =>
    presets = @current_user\get_presets!
    presets_formattted = for p in *presets
      out = { id: p.id }
      for k,v in pairs p.data
        out[k] = v
      out

    json: {
      success: true
      presets: presets_formattted
    }

  create_preset: =>
    trim_filter @params
    assert_valid @params, {
      {"preset", type: "string"}
      {"name", type: "string"}
    }

    import from_json from require "lapis.util"
    preset = from_json @params.preset
    out = Presets\create {
      user_id: @current_user.id
      name: @params.name
      data: preset
    }

    json: {
      success: true
      preset_id: out.id
    }
