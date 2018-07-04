
import types from require "tableshape"
import trim from require "lapis.util"
db = require "lapis.db"

trimmed_text = types.string / trim * types.custom(
  (v) -> v != "", "is empty string"
  describe: -> "not empty"
)

empty = types.one_of {
  types.nil
  types.pattern("^%s*$") / nil
}, describe: -> "empty"

integer = (types.one_of {
  types.number
  types.string / tonumber * types.number
}, describe: -> "integer") / math.floor

number = (types.one_of {
  types.number
  types.string / tonumber * types.number
}, describe: -> "number")

db_id = types.one_of({
  types.number * types.custom (v) -> v == math.floor(v)
  types.string / trim * types.pattern("^%d+$") / tonumber
}, describe: -> "integer") * types.range(0, 2147483647)

db_nullable = (t) ->
  t + empty / db.NULL

db_enum = (e) ->
  names = {unpack e}

  types.one_of {
    types.one_of(names) / e\for_db
    integer / (v) -> e[v] and e\for_db v
  }, describe: ->
    "enum(#{table.concat names, ", "})"

truncated_text = (len) ->
  trimmed_text * types.string\length(1,len)\on_repair (s) -> s\sub 1, len

params = (shape) ->
  (p) ->
    local errors
    out = {}

    for key, t in pairs shape
      out[key], err = t\transform p[key]
      if err
        err = "#{key}: #{err}"
        if errors
          table.insert errors, err
        else
          errors = {err}

    if errors and next errors
      return nil, errors
    else
      out

assert_params = (tbl, shape) ->
  fn = params(shape)
  out, errs = fn tbl

  if out
    out, errs
  else
    coroutine.yield "error", errs
    error "coroutine did not yield"


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


{:trimmed_text, :empty, :integer, :number, :truncated_text, :params, :assert_params, :db_nullable, :db_id, :db_enum, :difference}
