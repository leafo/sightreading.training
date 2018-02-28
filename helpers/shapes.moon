
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

db_nullable = (t) ->
  t + empty / db.NULL

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


{:trimmed_text, :empty, :truncated_text, :params, :assert_params, :db_nullable}
