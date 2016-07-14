setmetatable {}, {
  __index: (model_name) =>
    import truncate_tables from require "lapis.spec.db"
    import before_each from require "busted"

    with m = assert require("models")[model_name], "invalid model: #{model_name}"
      before_each ->
        truncate_tables m
}
