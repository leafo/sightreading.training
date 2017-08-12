

json = require "cjson"
discount = require "discount"

fname = ...

f = assert io.open fname
contents = f\read "*a"

print json.encode {
  contents: discount(contents)
}
