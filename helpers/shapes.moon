
types = require "lapis.validate.types"
db = require "lapis.db"

integer = (types.one_of {
  types.number
  types.string / tonumber * types.number
})\describe("integer") / math.floor

number = types.one_of({
  types.number
  types.string / tonumber * types.number
})\describe "number"

db_nullable = (t) ->
  t + types.empty / db.NULL

-- create a table representing the difference in fields
difference = (update, source) ->
  s = {}
  for field, new_value in pairs update
    if new_value == db.NULL
      new_value = nil

    matcher = types.equivalent(new_value) + types.any\tag (state, v) ->
      state.before = v
      state.after = new_value

    s[field] = types.scope matcher, tag: field

  assert types.shape(s, open: true) source


{:integer, :number, :db_nullable,  :difference}
