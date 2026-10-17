import Flow from require "lapis.flow"
import assert_error from require "lapis.application"
import from_json, to_json from require "lapis.util"

class TrainerPreferencesFlow extends Flow
  save: =>
    assert_error @current_user, "must be logged in"
    payload = @params.preferences
    assert_error type(payload) == "string" and #payload <= 16384, "invalid preferences"
    ok, preferences = pcall from_json, payload
    assert_error ok and type(preferences) == "table", "invalid preferences"
    assert_error preferences.version == 1, "unsupported preferences version"

    -- Whitelist the preference document; never accept a user id or runtime stats.
    out = { version: 1 }
    for field in *{"staff", "generator", "key"}
      value = preferences[field]
      assert_error type(value) == "string" and #value <= 80, "invalid #{field}"
      out[field] = value

    assert_error preferences.mode == "wait" or preferences.mode == "scroll", "invalid mode"
    assert_error type(preferences.speed) == "number" and preferences.speed >= 50 and preferences.speed <= 300, "invalid speed"
    assert_error type(preferences.generatorSettings) == "table", "invalid generator settings"
    out.mode = preferences.mode
    out.speed = preferences.speed
    out.generatorSettings = preferences.generatorSettings
    for field in *{"keyboardOpen", "settingsOpen"}
      assert_error type(preferences[field]) == "boolean", "invalid #{field}"
      out[field] = preferences[field]

    @current_user\update trainer_preferences: to_json out
